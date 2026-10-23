"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devFallbackLanguageStore = exports.DevFallbackLanguageStore = void 0;
const language_types_js_1 = require("./language.types.js");
class DevFallbackLanguageStore {
    static instance;
    languages = new Map();
    uiBundles = new Map(); // key: `${lang}:${version}`
    questionTranslations = new Map(); // key: `${code}:${lang}:${version}`
    optionTranslations = new Map(); // key: `${code}:${lang}:${version}`
    questionHelpTexts = new Map(); // key: `${code}:${lang}:${version}`
    helpArticles = new Map(); // key: `${topic}:${lang}:${version}`
    reviews = new Map();
    syncReceipts = new Map();
    heartbeats = new Map();
    constructor() {
        this.seedDefaults();
    }
    static getInstance() {
        if (!DevFallbackLanguageStore.instance) {
            DevFallbackLanguageStore.instance = new DevFallbackLanguageStore();
        }
        return DevFallbackLanguageStore.instance;
    }
    clearAll() {
        this.languages.clear();
        this.uiBundles.clear();
        this.questionTranslations.clear();
        this.optionTranslations.clear();
        this.questionHelpTexts.clear();
        this.helpArticles.clear();
        this.reviews.clear();
        this.syncReceipts.clear();
        this.heartbeats.clear();
        this.seedDefaults();
    }
    seedDefaults() {
        const now = new Date().toISOString();
        // 1. Supported Languages
        const defaultLangs = [
            {
                id: 'lang-en',
                code: 'en',
                displayName: 'English',
                textDirection: 'ltr',
                uiStatus: 'READY',
                voiceInputStatus: 'SUPPORTED',
                voiceOutputStatus: 'SUPPORTED',
                enabled: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'lang-ta',
                code: 'ta',
                displayName: 'தமிழ்',
                textDirection: 'ltr',
                uiStatus: 'READY',
                voiceInputStatus: 'SUPPORTED',
                voiceOutputStatus: 'SUPPORTED',
                enabled: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'lang-hi',
                code: 'hi',
                displayName: 'हिन्दी',
                textDirection: 'ltr',
                uiStatus: 'PARTIAL',
                voiceInputStatus: 'SUPPORTED',
                voiceOutputStatus: 'SUPPORTED',
                enabled: true,
                createdAt: now,
                updatedAt: now,
            },
        ];
        for (const l of defaultLangs)
            this.languages.set(l.code, l);
        // 2. UI String Bundles
        this.uiBundles.set('en:1.0.0', {
            id: 'bundle-en-1',
            language: 'en',
            version: '1.0.0',
            status: language_types_js_1.ContentStatuses.APPROVED,
            strings: {
                'common.welcome': 'Welcome to THUNAI',
                'common.next': 'Next',
                'common.previous': 'Previous',
                'common.submit': 'Submit Answer',
                'common.confirm': 'Confirm',
                'common.cancel': 'Cancel',
                'common.yes': 'Yes',
                'common.no': 'No',
                'common.skip': 'Skip Question',
                'common.prefer_not_to_say': 'Prefer not to answer',
                'common.repeat': 'Repeat Question',
                'common.listening': 'Listening...',
                'common.speak_now': 'Speak Now',
                'common.touch_to_answer': 'Tap your choice below',
                'common.help': 'I Need Help',
                'common.offline': 'Working Offline — Answers are saved locally',
                'common.timeout_warning': 'Are you still there? The screen will reset in {seconds} seconds.',
                'voice.confirm_prompt': 'You said: {answer}. Is that correct?',
                'voice.not_understood': 'We could not hear your answer clearly. Please tap your choice on the screen.',
            },
            createdBy: 'admin-author-1',
            reviewedBy: 'clinician-reviewer-1',
            reviewedAt: now,
            createdAt: now,
            updatedAt: now,
        });
        this.uiBundles.set('ta:1.0.0', {
            id: 'bundle-ta-1',
            language: 'ta',
            version: '1.0.0',
            status: language_types_js_1.ContentStatuses.APPROVED,
            strings: {
                'common.welcome': 'துணை (THUNAI)-க்கு நல்வரவு',
                'common.next': 'அடுத்து',
                'common.previous': 'முந்தையது',
                'common.submit': 'பதிலைச் சமர்ப்பிக்கவும்',
                'common.confirm': 'உறுதி செய்',
                'common.cancel': 'ரத்து செய்',
                'common.yes': 'ஆம்',
                'common.no': 'இல்லை',
                'common.skip': 'இந்த கேள்வியைத் தவிர்க்கவும்',
                'common.prefer_not_to_say': 'பதிலளிக்க விரும்பவில்லை',
                'common.repeat': 'மீண்டும் கேள்வியை வாசி',
                'common.listening': 'கவனிக்கிறது...',
                'common.speak_now': 'இப்போது பேசவும்',
                'common.touch_to_answer': 'திரையில் உங்கள் பதிலை அழுத்தவும்',
                'common.help': 'உதவி தேவை',
                'common.offline': 'இணையம் இல்லை — பதில்கள் சாதனத்தில் சேமிக்கப்படுகின்றன',
                'common.timeout_warning': 'நீங்கள் இன்னும் இருக்கிறீர்களா? {seconds} வினாடிகளில் திரை மீட்டமைக்கப்படும்.',
                'voice.confirm_prompt': 'நீங்கள் கூறியது: {answer}. இது சரியானதா?',
                'voice.not_understood': 'உங்கள் குரல் தெளிவாக கேட்கவில்லை. திரையில் உள்ள தேர்வுகளில் ஒன்றைத் தொடவும்.',
            },
            createdBy: 'admin-author-1',
            reviewedBy: 'clinician-reviewer-tamil',
            reviewedAt: now,
            createdAt: now,
            updatedAt: now,
        });
        // 3. Approved Question Translations (English & Tamil General OPD)
        const questionsSeed = [
            {
                code: 'CHIEF_COMPLAINT_PRIMARY',
                en: 'What is your primary reason or main health problem for visiting the doctor today?',
                ta: 'இன்று மருத்துவரை சந்திக்க உங்கள் முதன்மையான உடல்நலக் குறைபாடு அல்லது பிரச்சனை என்ன?',
                enAudio: 'Please describe the main symptom or illness you are experiencing.',
                taAudio: 'உங்கள் முதன்மையான உடல்நலக் குறைபாட்டை தெளிவாகக் கூறவும்.',
                isCritical: true,
            },
            {
                code: 'CHIEF_COMPLAINT_DURATION',
                en: 'How long have you been experiencing these main symptoms?',
                ta: 'இந்த அறிகுறிகள் எத்தனை நாட்களாக அல்லது வாரங்களாக உள்ளன?',
                enAudio: 'How many days, weeks, or months ago did this problem start?',
                taAudio: 'இந்த பிரச்சனை எப்போது தொடங்கியது?',
                isCritical: false,
            },
            {
                code: 'CHEST_PAIN_DYSPNEA',
                en: 'Do you currently have chest pain, chest heaviness, or difficulty breathing?',
                ta: 'தற்போது நெஞ்சு வலி, நெஞ்சு பாரம் அல்லது மூச்சுத் திணறல் உள்ளதா?',
                enAudio: 'Have you felt pain in your chest or shortness of breath today?',
                taAudio: 'உங்களுக்கு நெஞ்சு வலியோ அல்லது மூச்சு விட சிரமமோ உள்ளதா?',
                isCritical: true,
            },
            {
                code: 'FEVER_CHILLS',
                en: 'Do you currently have high fever, chills, or body shivering?',
                ta: 'தற்போது அதிக காய்ச்சல், குளிர் அல்லது உடல் நடுக்கம் உள்ளதா?',
                enAudio: 'Do you have hot fever or cold shivers?',
                taAudio: 'காய்ச்சல் அல்லது குளிர் நடுக்கம் உள்ளதா?',
                isCritical: true,
            },
            {
                code: 'PAIN_SEVERITY',
                en: 'How would you rate the severity of your pain or discomfort right now?',
                ta: 'தற்போது உங்கள் வலியின் அளவை 0 முதல் 10 வரை எவ்வாறு மதிப்பிடுவீர்கள்?',
                enAudio: 'On a scale from 0 to 10, how severe is your pain?',
                taAudio: 'உங்கள் வலியின் அளவு எவ்வளவு உள்ளது?',
                isCritical: false,
            },
            {
                code: 'PAST_CONDITIONS',
                en: 'Have you been previously diagnosed with any ongoing medical conditions?',
                ta: 'முன்பு மருத்துவரால் கண்டறியப்பட்ட நீண்டகால நோய்கள் ஏதேனும் உங்களுக்கு உள்ளதா?',
                enAudio: 'Please select all past conditions diagnosed by a doctor.',
                taAudio: 'உங்களுக்கு ஏற்கனவே உள்ள நோய்களைத் தேர்ந்தெடுக்கவும்.',
                isCritical: true,
            },
            {
                code: 'PAST_SURGERIES',
                en: 'Have you undergone any surgeries or major hospital admissions in the past?',
                ta: 'முன்பு ஏதேனும் அறுவை சிகிச்சை அல்லது மருத்துவமனையில் அனுமதிக்கப்பட்ட அனுபவம் உண்டா?',
                enAudio: 'Have you had any operations or stayed in hospital previously?',
                taAudio: 'முன்பு ஏதேனும் அறுவை சிகிச்சை நடந்துள்ளதா?',
                isCritical: false,
            },
            {
                code: 'CURRENT_MEDICATIONS',
                en: 'Are you currently taking any daily prescription medicines or regular tablets?',
                ta: 'தற்போது தினசரி உட்கொள்ளும் மாத்திரைகள் அல்லது மருந்துகள் ஏதேனும் உள்ளதா?',
                enAudio: 'Do you take any regular medicines for BP, sugar, or other illnesses?',
                taAudio: 'தினசரி மாத்திரைகள் ஏதேனும் சாப்பிடுகிறீர்களா?',
                isCritical: true,
            },
            {
                code: 'ALLERGIES',
                en: 'Do you have any known allergies to medicines, penicillin, foods, or injections?',
                ta: 'மருந்துகள், பென்சிலின், உணவு அல்லது ஊசிகளுக்கு ஏதேனும் ஒவ்வாமை (அலர்ஜி) உண்டா?',
                enAudio: 'Have you had a bad reaction or allergy to any tablet, injection, or food?',
                taAudio: 'ஏதேனும் மருந்து அல்லது உணவினால் ஒவ்வாமை ஏற்பட்டதா?',
                isCritical: true,
            },
            {
                code: 'LIFESTYLE_HABITS',
                en: 'Do you use tobacco, beedi, cigarettes, or consume alcohol?',
                ta: 'புகையிலை, பீடி, சிகரெட் அல்லது மதுபானம் பயன்படுத்தும் பழக்கம் உள்ளதா?',
                enAudio: 'Do you smoke, chew tobacco, or drink alcohol regularly?',
                taAudio: 'புகையிலை அல்லது மது அருந்தும் பழக்கம் உள்ளதா?',
                isCritical: false,
            },
            {
                code: 'FAMILY_HISTORY',
                en: 'Is there a family history of early heart disease, stroke, or diabetes in your parents or siblings?',
                ta: 'உங்கள் பெற்றோர் அல்லது உடன் பிறந்தவர்களுக்கு இதய நோய், பக்கவாதம் அல்லது சர்க்கரை நோய் உள்ளதா?',
                enAudio: 'Did your parents or siblings have heart attacks, diabetes, or stroke at an early age?',
                taAudio: 'குடும்பத்தில் யாருக்கேனும் இதய நோய் அல்லது சர்க்கரை நோய் உண்டா?',
                isCritical: false,
            },
        ];
        for (const q of questionsSeed) {
            // English
            this.questionTranslations.set(`${q.code}:en:1`, {
                id: `qt-en-${q.code}`,
                questionCode: q.code,
                language: 'en',
                templateVersion: '1.0.0',
                promptText: q.en,
                promptAudioHint: q.enAudio,
                status: language_types_js_1.ContentStatuses.APPROVED,
                version: 1,
                isCritical: q.isCritical,
                createdBy: 'admin-author-1',
                reviewedBy: 'clinician-reviewer-1',
                reviewedAt: now,
                createdAt: now,
                updatedAt: now,
            });
            // Tamil
            this.questionTranslations.set(`${q.code}:ta:1`, {
                id: `qt-ta-${q.code}`,
                questionCode: q.code,
                language: 'ta',
                templateVersion: '1.0.0',
                promptText: q.ta,
                promptAudioHint: q.taAudio,
                status: language_types_js_1.ContentStatuses.APPROVED,
                version: 1,
                isCritical: q.isCritical,
                createdBy: 'admin-author-1',
                reviewedBy: 'clinician-reviewer-tamil',
                reviewedAt: now,
                createdAt: now,
                updatedAt: now,
            });
        }
        // 4. Approved Option Translations with Spoken Synonyms
        const optionsSeed = [
            {
                code: 'YES',
                qCode: 'CHEST_PAIN_DYSPNEA',
                enLabel: 'Yes',
                enSynonyms: ['yes', 'yeah', 'yep', 'correct', 'i have it', 'true'],
                taLabel: 'ஆம்',
                taSynonyms: ['ஆம்', 'ஆமா', 'ஆமாம்', 'இருக்கிறது', 'உண்டு', 'சரி'],
            },
            {
                code: 'NO',
                qCode: 'CHEST_PAIN_DYSPNEA',
                enLabel: 'No',
                enSynonyms: ['no', 'nope', 'none', 'not at all', 'false'],
                taLabel: 'இல்லை',
                taSynonyms: ['இல்லை', 'இல்ல', 'இல்லவே இல்ல', 'கிடையாது'],
            },
            {
                code: 'DURATION_LT_24H',
                qCode: 'CHIEF_COMPLAINT_DURATION',
                enLabel: 'Less than 24 hours',
                enSynonyms: ['less than 24 hours', 'one day', 'today', 'since morning', 'yesterday'],
                taLabel: '24 மணி நேரத்திற்கும் குறைவாக',
                taSynonyms: ['ஒரு நாள்', 'இன்று', 'இன்னைக்கு', 'காலையிலிருந்து', 'நேற்றிலிருந்து'],
            },
            {
                code: 'DURATION_1_3D',
                qCode: 'CHIEF_COMPLAINT_DURATION',
                enLabel: '1 to 3 days',
                enSynonyms: ['one to three days', 'two days', 'three days', 'few days'],
                taLabel: '1 முதல் 3 நாட்கள்',
                taSynonyms: ['ஒன்று முதல் மூன்று நாட்கள்', 'ரெண்டு நாள்', 'மூன்று நாள்', 'சில நாட்கள்'],
            },
            {
                code: 'DURATION_4_7D',
                qCode: 'CHIEF_COMPLAINT_DURATION',
                enLabel: '4 to 7 days',
                enSynonyms: ['four to seven days', 'one week', 'a week'],
                taLabel: '4 முதல் 7 நாட்கள்',
                taSynonyms: ['நான்கு முதல் ஏழு நாட்கள்', 'ஒரு வாரம்'],
            },
            {
                code: 'DURATION_1_4W',
                qCode: 'CHIEF_COMPLAINT_DURATION',
                enLabel: '1 to 4 weeks',
                enSynonyms: ['one to four weeks', 'two weeks', 'three weeks'],
                taLabel: '1 முதல் 4 வாரங்கள்',
                taSynonyms: ['இரண்டு வாரம்', 'மூன்று வாரம்', 'பல வாரங்கள்'],
            },
            {
                code: 'DURATION_GT_1M',
                qCode: 'CHIEF_COMPLAINT_DURATION',
                enLabel: 'More than 1 month',
                enSynonyms: ['more than a month', 'many months', 'long time'],
                taLabel: '1 மாதத்திற்கும் மேலாக',
                taSynonyms: ['ஒரு மாதத்திற்கு மேல்', 'நீண்ட நாட்களாக', 'பல மாதங்கள்'],
            },
            {
                code: 'SEV_NONE',
                qCode: 'PAIN_SEVERITY',
                enLabel: 'None (0)',
                enSynonyms: ['none', 'zero', 'no pain'],
                taLabel: 'வலி இல்லை (0)',
                taSynonyms: ['வலி இல்லை', 'பூஜ்ஜியம்', 'வலி கிடையாது'],
            },
            {
                code: 'SEV_MILD',
                qCode: 'PAIN_SEVERITY',
                enLabel: 'Mild (1-3)',
                enSynonyms: ['mild', 'slight', 'little bit', 'one', 'two', 'three'],
                taLabel: 'லேசான வலி (1-3)',
                taSynonyms: ['லேசான வலி', 'கொஞ்சம்', 'சிறிய அளவு'],
            },
            {
                code: 'SEV_MODERATE',
                qCode: 'PAIN_SEVERITY',
                enLabel: 'Moderate (4-6)',
                enSynonyms: ['moderate', 'medium', 'four', 'five', 'six'],
                taLabel: 'நடுத்தர வலி (4-6)',
                taSynonyms: ['நடுத்தர வலி', 'மிதமான வலி', 'தாங்க முடிகிறது'],
            },
            {
                code: 'SEV_SEVERE',
                qCode: 'PAIN_SEVERITY',
                enLabel: 'Severe (7-8)',
                enSynonyms: ['severe', 'high pain', 'bad', 'seven', 'eight'],
                taLabel: 'கடுமையான வலி (7-8)',
                taSynonyms: ['கடுமையான வலி', 'அதிக வலி', 'ரொம்ப வலி'],
            },
            {
                code: 'SEV_UNBEARABLE',
                qCode: 'PAIN_SEVERITY',
                enLabel: 'Very Severe / Unbearable (9-10)',
                enSynonyms: ['unbearable', 'worst pain', 'nine', 'ten', 'extreme'],
                taLabel: 'தாங்க முடியாத வலி (9-10)',
                taSynonyms: ['தாங்க முடியாத வலி', 'உச்சக்கட்ட வலி', 'மிக கடுமையான வலி'],
            },
            {
                code: 'COND_DIABETES',
                qCode: 'PAST_CONDITIONS',
                enLabel: 'Diabetes',
                enSynonyms: ['diabetes', 'sugar', 'blood sugar'],
                taLabel: 'சர்க்கரை நோய்',
                taSynonyms: ['சர்க்கரை நோய்', 'சுகர்', 'நீரிழிவு'],
            },
            {
                code: 'COND_HYPERTENSION',
                qCode: 'PAST_CONDITIONS',
                enLabel: 'Hypertension / High BP',
                enSynonyms: ['bp', 'high bp', 'hypertension', 'blood pressure'],
                taLabel: 'உயர் ரத்த அழுத்தம் (BP)',
                taSynonyms: ['ரத்த அழுத்தம்', 'பிபி', 'ஹை பிபி'],
            },
            {
                code: 'COND_HEART',
                qCode: 'PAST_CONDITIONS',
                enLabel: 'Heart Disease',
                enSynonyms: ['heart disease', 'cardiac', 'heart attack'],
                taLabel: 'இதய நோய்',
                taSynonyms: ['இதய நோய்', 'மாரடைப்பு'],
            },
            {
                code: 'COND_NONE',
                qCode: 'PAST_CONDITIONS',
                enLabel: 'None of the above',
                enSynonyms: ['none of the above', 'nothing', 'no disease'],
                taLabel: 'எதுவுமில்லை',
                taSynonyms: ['எதுவுமில்லை', 'ஒன்றுமில்லை', 'வேறு எதுவும் இல்லை'],
            },
        ];
        for (const opt of optionsSeed) {
            // English
            this.optionTranslations.set(`${opt.code}:en:1`, {
                id: `opt-en-${opt.code}`,
                optionCode: opt.code,
                questionCode: opt.qCode,
                language: 'en',
                label: opt.enLabel,
                spokenSynonyms: opt.enSynonyms,
                status: language_types_js_1.ContentStatuses.APPROVED,
                version: 1,
                createdBy: 'admin-author-1',
                reviewedBy: 'clinician-reviewer-1',
                reviewedAt: now,
                createdAt: now,
                updatedAt: now,
            });
            // Tamil
            this.optionTranslations.set(`${opt.code}:ta:1`, {
                id: `opt-ta-${opt.code}`,
                optionCode: opt.code,
                questionCode: opt.qCode,
                language: 'ta',
                label: opt.taLabel,
                spokenSynonyms: opt.taSynonyms,
                status: language_types_js_1.ContentStatuses.APPROVED,
                version: 1,
                createdBy: 'admin-author-1',
                reviewedBy: 'clinician-reviewer-tamil',
                reviewedAt: now,
                createdAt: now,
                updatedAt: now,
            });
            // Hindi seed for core YES / NO options
            if (opt.code === 'YES') {
                this.optionTranslations.set(`${opt.code}:hi:1`, {
                    id: `opt-hi-${opt.code}`,
                    optionCode: opt.code,
                    questionCode: opt.qCode,
                    language: 'hi',
                    label: 'हाँ',
                    spokenSynonyms: ['हाँ', 'हा', 'जी हाँ', 'हाँजी', 'है', 'सही'],
                    status: language_types_js_1.ContentStatuses.APPROVED,
                    version: 1,
                    createdBy: 'admin-author-1',
                    reviewedBy: 'clinician-reviewer-hindi',
                    reviewedAt: now,
                    createdAt: now,
                    updatedAt: now,
                });
            }
            if (opt.code === 'NO') {
                this.optionTranslations.set(`${opt.code}:hi:1`, {
                    id: `opt-hi-${opt.code}`,
                    optionCode: opt.code,
                    questionCode: opt.qCode,
                    language: 'hi',
                    label: 'नहीं',
                    spokenSynonyms: ['नहीं', 'ना', 'जी नहीं', 'बिल्कुल नहीं'],
                    status: language_types_js_1.ContentStatuses.APPROVED,
                    version: 1,
                    createdBy: 'admin-author-1',
                    reviewedBy: 'clinician-reviewer-hindi',
                    reviewedAt: now,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }
        // 5. Question Help Texts
        const helpSeed = [
            {
                code: 'CHEST_PAIN_DYSPNEA',
                en: 'This question asks if you feel pressing, tight pain in your chest, or if breathing feels hard. Please say Yes if you feel this now.',
                ta: 'உங்கள் நெஞ்சில் பாரம், இறுக்கம் அல்லது மூச்சு விட சிரமம் உள்ளதா என்பதை இந்த கேள்வி கேட்கிறது. தற்போது அவ்வாறு உணர்ந்தால் "ஆம்" என்று கூறவும்.',
            },
            {
                code: 'PAIN_SEVERITY',
                en: 'Rating from 0 to 10 helps the doctor know pain intensity. 0 means no pain, 5 is moderate discomfort, and 10 is the worst pain imaginable.',
                ta: '0 முதல் 10 வரை மதிப்பிடுவது மருத்துவருக்கு உங்கள் வலியின் அளவை அறிய உதவும். 0 என்பது வலி இல்லை, 10 என்பது தாங்க முடியாத உச்சக்கட்ட வலி.',
            },
            {
                code: 'CURRENT_MEDICATIONS',
                en: 'List any tablets, insulin, or syrups prescribed by a doctor that you take on a regular basis.',
                ta: 'மருத்துவர் பரிந்துரைத்த நீங்கள் தொடர்ந்து சாப்பிடும் பிபி, சர்க்கரை அல்லது பிற மாத்திரைகளை தெரிவிக்கவும்.',
            },
        ];
        for (const h of helpSeed) {
            this.questionHelpTexts.set(`${h.code}:en:1`, {
                id: `qh-en-${h.code}`,
                questionCode: h.code,
                language: 'en',
                plainExplanation: h.en,
                status: language_types_js_1.ContentStatuses.APPROVED,
                version: 1,
                createdBy: 'admin-author-1',
                reviewedBy: 'clinician-reviewer-1',
                reviewedAt: now,
                createdAt: now,
                updatedAt: now,
            });
            this.questionHelpTexts.set(`${h.code}:ta:1`, {
                id: `qh-ta-${h.code}`,
                questionCode: h.code,
                language: 'ta',
                plainExplanation: h.ta,
                status: language_types_js_1.ContentStatuses.APPROVED,
                version: 1,
                createdBy: 'admin-author-1',
                reviewedBy: 'clinician-reviewer-tamil',
                reviewedAt: now,
                createdAt: now,
                updatedAt: now,
            });
        }
        // 6. Kiosk Help Articles
        const articlesSeed = [
            {
                topic: 'how_to_use',
                enTitle: 'How to use this kiosk',
                enBody: 'Read or listen to each question. Tap your answer on screen, or speak clearly when the microphone is active. You can tap "I Need Help" anytime for assistance.',
                taTitle: 'இந்த கியோஸ்க்கை எவ்வாறு பயன்படுத்துவது',
                taBody: 'ஒவ்வொரு கேள்வியையும் படித்து அல்லது கேட்டு பதிலளிக்கவும். திரையில் உள்ள தேர்வுகளை தொடலாம் அல்லது மைக்ரோஃபோன் இயங்கும் போது பேசலாம். உதவி தேவைப்பட்டால் "உதவி தேவை" பொத்தானை அழுத்தவும்.',
            },
            {
                topic: 'document_scan',
                enTitle: 'How to scan your old prescription',
                enBody: 'Place your prescription flat on the scanner tray below with writing facing up. Tap "Capture" and verify the image is clearly readable.',
                taTitle: 'மருந்துச் சீட்டை ஸ்கேன் செய்வது எப்படி',
                taBody: 'உங்கள் பழைய மருந்துச் சீட்டை கீழே உள்ள ஸ்கேனர் தட்டில் சமமாக வைக்கவும். "படம் எடு" என்பதை அழுத்தி எழுத்துக்கள் தெளிவாக உள்ளதா என்பதை சரிபார்க்கவும்.',
            },
            {
                topic: 'what_next',
                enTitle: 'What happens after finishing intake',
                enBody: 'Your intake answers and scanned documents will be prepared for your OPD doctor. Please take your token slip and wait in the OPD lounge until called.',
                taTitle: 'முடிந்த பிறகு அடுத்து என்ன நடக்கும்',
                taBody: 'உங்கள் பதில்கள் மற்றும் ஆவணங்கள் OPD மருத்துவரிடம் ஒப்படைக்க தயார் செய்யப்படும். உங்கள் டோக்கனை பெற்றுக்கொண்டு காத்திருப்பு அறையில் அமரவும்.',
            },
            {
                topic: 'call_staff',
                enTitle: 'How to get staff help',
                enBody: 'Tap the red "I Need Help" button at the bottom right. A hospital attendant will come to your kiosk immediately.',
                taTitle: 'ஊழியரின் உதவியைப் பெறுவது எப்படி',
                taBody: 'கீழே வலதுபுறத்தில் உள்ள சிவப்பு "உதவி தேவை" பொத்தானை அழுத்தவும். மருத்துவமனை ஊழியர் உடனே வந்து உங்களுக்கு உதவுவார்.',
            },
        ];
        for (const art of articlesSeed) {
            this.helpArticles.set(`${art.topic}:en:1`, {
                id: `art-en-${art.topic}`,
                topic: art.topic,
                language: 'en',
                title: art.enTitle,
                body: art.enBody,
                status: language_types_js_1.ContentStatuses.APPROVED,
                version: 1,
                createdBy: 'admin-author-1',
                reviewedBy: 'clinician-reviewer-1',
                reviewedAt: now,
                createdAt: now,
                updatedAt: now,
            });
            this.helpArticles.set(`${art.topic}:ta:1`, {
                id: `art-ta-${art.topic}`,
                topic: art.topic,
                language: 'ta',
                title: art.taTitle,
                body: art.taBody,
                status: language_types_js_1.ContentStatuses.APPROVED,
                version: 1,
                createdBy: 'admin-author-1',
                reviewedBy: 'clinician-reviewer-tamil',
                reviewedAt: now,
                createdAt: now,
                updatedAt: now,
            });
        }
    }
}
exports.DevFallbackLanguageStore = DevFallbackLanguageStore;
exports.devFallbackLanguageStore = DevFallbackLanguageStore.getInstance();
