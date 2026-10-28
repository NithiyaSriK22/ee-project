import { prisma, checkDatabaseHealth } from '../database/prisma.js';

export class EmailGeneratorUtil {
  /**
   * Cleans a doctor name to generate a short local part (e.g., "Dr. Arun Kumar" -> "arun")
   */
  public static cleanLocalPart(name: string): string {
    const stripped = name.replace(/^(dr\.?|doctor|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
    const words = stripped.split(/\s+/).filter(Boolean);
    const chosenWord = words.find((w) => w.replace(/[^a-zA-Z]/g, '').length > 1) || words[0] || 'doctor';
    const sanitized = chosenWord.toLowerCase().replace(/[^a-z0-9]/g, '');
    return sanitized || 'doctor';
  }

  /**
   * Generates a unique, short development email (e.g., "arun@medbrief.test", or "arun2@medbrief.test" on collision)
   */
  public static async generateUniqueShortEmail(fullName: string, domain: string = 'medbrief.test'): Promise<string> {
    const base = this.cleanLocalPart(fullName);
    let candidate = `${base}@${domain}`;

    const isDbUp = await checkDatabaseHealth();
    if (!isDbUp) {
      return candidate;
    }

    let counter = 1;
    // Limit to 100 iterations to prevent infinite loops
    while (counter <= 100) {
      const existing = await prisma.staffUser.findUnique({
        where: { email: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      counter++;
      candidate = `${base}${counter}@${domain}`;
    }

    return `${base}${Date.now().toString().slice(-4)}@${domain}`;
  }
}
