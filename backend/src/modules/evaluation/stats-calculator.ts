import {
  ConfidenceInterval,
  CoverageVsErrorPoint,
  InterAnnotatorAgreement,
  SampleSizeCalculationRequest,
  SampleSizeCalculationResult,
} from './evaluation.types.js';

export class StatsCalculator {
  private static readonly Z_95 = 1.959963984540054; // Standard normal quantile for 95% two-sided CI

  /**
   * Computes the Wilson Score 95% confidence interval for a binomial proportion.
   * Accurate for both small sample sizes and proportions near 0 or 1.
   */
  public static calculateWilsonScoreInterval(
    failuresOrSuccesses: number,
    totalSamples: number
  ): ConfidenceInterval {
    if (totalSamples <= 0) {
      return {
        pointEstimate: 0,
        lower95: 0,
        upper95: 0,
        method: 'WILSON_SCORE',
      };
    }

    const k = Math.max(0, failuresOrSuccesses);
    const n = totalSamples;
    const p = k / n;
    const z = this.Z_95;
    const z2 = z * z;

    const denominator = 1 + z2 / n;
    const centerAdjusted = (p + z2 / (2 * n)) / denominator;
    const sqrtTerm = Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
    const margin = (z * sqrtTerm) / denominator;

    const lower = Math.max(0, centerAdjusted - margin);
    const upper = Math.min(1, centerAdjusted + margin);

    return {
      pointEstimate: Number(p.toFixed(6)),
      lower95: Number(lower.toFixed(6)),
      upper95: Number(upper.toFixed(6)),
      method: 'WILSON_SCORE',
    };
  }

  /**
   * Applies the "Rule of Three" for zero-failure observations.
   * When zero failures are observed in n independent trials,
   * the upper 95% confidence bound is approximately 3 / n.
   */
  public static calculateRuleOfThreeUpper(
    totalSamples: number
  ): ConfidenceInterval {
    if (totalSamples <= 0) {
      return {
        pointEstimate: 0,
        lower95: 0,
        upper95: 1.0,
        method: 'RULE_OF_THREE',
      };
    }

    const upper = Math.min(1.0, 3.0 / totalSamples);
    return {
      pointEstimate: 0.0,
      lower95: 0.0,
      upper95: Number(upper.toFixed(6)),
      method: 'RULE_OF_THREE',
    };
  }

  /**
   * Unified safety confidence interval:
   * Uses Wilson score, but if zero failures are observed, reports Rule of Three
   * alongside Wilson score bounds for conservative clinical interpretation.
   */
  public static calculateProportionWithConfidence(
    failures: number,
    totalSamples: number
  ): ConfidenceInterval {
    if (failures === 0 && totalSamples > 0) {
      const wilson = this.calculateWilsonScoreInterval(0, totalSamples);
      const ruleOfThree = this.calculateRuleOfThreeUpper(totalSamples);
      // Return conservative bound between Wilson upper and Rule of Three
      const upper = Math.max(wilson.upper95, ruleOfThree.upper95);
      return {
        pointEstimate: 0.0,
        lower95: 0.0,
        upper95: Number(upper.toFixed(6)),
        method: 'RULE_OF_THREE',
      };
    }
    return this.calculateWilsonScoreInterval(failures, totalSamples);
  }

  /**
   * Sample Size Calculator (Section 5):
   * Solves for minimum required sample size N before collecting clinical evaluation data.
   * If zero failures are expected, N = ceil(3 / targetMaxRate) ensures the upper 95% bound <= targetMaxRate.
   */
  public static calculateSampleSize(
    req: SampleSizeCalculationRequest
  ): SampleSizeCalculationResult {
    const target = req.targetMaxFalseVerifiedRate;
    if (target <= 0 || target >= 1) {
      throw new Error('Target maximum false-verified rate must be strictly between 0 and 1 (e.g., 0.01 for 1%).');
    }

    // Rule of Three formula: upper95 = 3 / n <= target  =>  n >= 3 / target
    const ruleOfThreeRequiredN = Math.ceil(3.0 / target);

    // Normal approximation formula for margin of error equal to target with expected baseline p = 0.005 or expectedUnderlyingRate
    const expectedP = req.expectedUnderlyingRate !== undefined ? req.expectedUnderlyingRate : 0.005;
    const marginOfError = target;
    const normalApproximationRequiredN = Math.ceil(
      (this.Z_95 * this.Z_95 * expectedP * (1 - expectedP)) / (marginOfError * marginOfError)
    );

    const recommendedMinimumSampleSize = Math.max(ruleOfThreeRequiredN, normalApproximationRequiredN, 100);

    return {
      ruleOfThreeRequiredN,
      normalApproximationRequiredN,
      recommendedMinimumSampleSize,
      rationale:
        `To statistically demonstrate an upper 95% confidence bound <= ${(target * 100).toFixed(2)}% with zero observed failures, ` +
        `the Rule of Three requires at least ${ruleOfThreeRequiredN} independent, stratified clinical samples.`,
      warningNotice:
        'Target sample size must be pre-registered and approved by the Clinical Safety Board before clinical dataset collection begins.',
    };
  }

  /**
   * Computes Cohen's Kappa coefficient for inter-annotator agreement on categorical classifications.
   * kappa = (Po - Pe) / (1 - Pe)
   */
  public static calculateInterAnnotatorAgreement(
    annotator1Values: string[],
    annotator2Values: string[]
  ): InterAnnotatorAgreement {
    if (annotator1Values.length !== annotator2Values.length) {
      throw new Error('Annotator value lists must have identical lengths.');
    }

    const n = annotator1Values.length;
    if (n === 0) {
      return {
        totalAnnotatedFields: 0,
        agreedFieldsCount: 0,
        disagreedFieldsCount: 0,
        rawAgreementRate: 1.0,
        cohensKappa: 1.0,
        adjudicationRequiredRate: 0.0,
      };
    }

    let agreedCount = 0;
    const freq1: Record<string, number> = {};
    const freq2: Record<string, number> = {};
    const allCategories = new Set<string>();

    for (let i = 0; i < n; i++) {
      const v1 = String(annotator1Values[i]).trim().toLowerCase();
      const v2 = String(annotator2Values[i]).trim().toLowerCase();

      allCategories.add(v1);
      allCategories.add(v2);

      freq1[v1] = (freq1[v1] || 0) + 1;
      freq2[v2] = (freq2[v2] || 0) + 1;

      if (v1 === v2) {
        agreedCount++;
      }
    }

    const po = agreedCount / n;

    // Chance agreement Pe
    let pe = 0;
    for (const cat of allCategories) {
      const p1 = (freq1[cat] || 0) / n;
      const p2 = (freq2[cat] || 0) / n;
      pe += p1 * p2;
    }

    let kappa: number;
    if (Math.abs(1.0 - pe) < 1e-9) {
      // Complete agreement and homogenous data
      kappa = po === 1.0 ? 1.0 : 0.0;
    } else {
      kappa = (po - pe) / (1.0 - pe);
    }

    // Clamp kappa to [-1.0, 1.0]
    kappa = Math.max(-1.0, Math.min(1.0, kappa));

    const disagreedCount = n - agreedCount;

    return {
      totalAnnotatedFields: n,
      agreedFieldsCount: agreedCount,
      disagreedFieldsCount: disagreedCount,
      rawAgreementRate: Number(po.toFixed(4)),
      cohensKappa: Number(kappa.toFixed(4)),
      adjudicationRequiredRate: Number((disagreedCount / n).toFixed(4)),
    };
  }

  /**
   * Generates a Coverage-vs-Error curve across varying confidence/similarity threshold increments.
   */
  public static generateCoverageVsErrorCurve(
    items: Array<{ score: number; isGroundTruthMatch: boolean }>
  ): CoverageVsErrorPoint[] {
    const points: CoverageVsErrorPoint[] = [];
    const thresholds = [0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];

    for (const th of thresholds) {
      let verifiedCount = 0;
      let falseVerifiedCount = 0;

      for (const item of items) {
        if (item.score >= th) {
          verifiedCount++;
          if (!item.isGroundTruthMatch) {
            falseVerifiedCount++;
          }
        }
      }

      const totalItems = items.length;
      const escalationCount = totalItems - verifiedCount;
      const escalationRate = totalItems > 0 ? escalationCount / totalItems : 0;
      const coverageRate = totalItems > 0 ? verifiedCount / totalItems : 0;

      const falseVerifiedRate = verifiedCount > 0 ? falseVerifiedCount / verifiedCount : 0;
      const ci = this.calculateProportionWithConfidence(falseVerifiedCount, verifiedCount);

      points.push({
        thresholdValue: th,
        falseVerifiedRate: Number(falseVerifiedRate.toFixed(4)),
        falseVerifiedUpper95: ci.upper95,
        escalationRate: Number(escalationRate.toFixed(4)),
        coverageRate: Number(coverageRate.toFixed(4)),
      });
    }

    return points;
  }
}
