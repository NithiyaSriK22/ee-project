export interface AppTranslations {
  // Global / Layout
  platformTitle: string;
  platformSubtitle: string;
  opdBadge: string;
  demoBanner: string;
  guideButton: string;
  helpButton: string;
  accessibilityButton: string;
  footerNotice: string;

  // Help Modal
  helpModalTitle: string;
  helpModalSubtitle: string;
  helpReasonPrompt: string;
  helpReasonUnwell: string;
  helpReasonPain: string;
  helpReasonScreen: string;
  helpReasonCompanion: string;
  helpCancel: string;
  helpCallStaff: string;
  helpCalling: string;
  helpSuccessTitle: string;
  helpSuccessMessage: string;
  helpSuccessButton: string;

  // Accessibility Modal
  a11yModalTitle: string;
  a11yModalSubtitle: string;
  a11yDoneButton: string;
  a11yStandardTitle: string;
  a11yStandardDesc: string;
  a11yHighContrastTitle: string;
  a11yHighContrastDesc: string;
  a11yHighContrastBadge: string;
  a11yVoiceFirstTitle: string;
  a11yVoiceFirstDesc: string;
  a11yVoiceFirstBadge: string;
  a11yTouchCaptionsTitle: string;
  a11yTouchCaptionsDesc: string;
  a11yTouchCaptionsBadge: string;
  a11ySimplifiedTitle: string;
  a11ySimplifiedDesc: string;
  a11ySimplifiedBadge: string;
  a11ySlowerPaceTitle: string;
  a11ySlowerPaceDesc: string;
  a11ySlowerPaceBadge: string;

  // Inactivity Modal
  timeoutTitle: string;
  timeoutMessage: string;
  timeoutContinueButton: string;

  // Wizard Steps
  stepWelcome: string;
  stepIdentity: string;
  stepLanguage: string;
  stepConsent: string;
  stepReady: string;

  // Welcome Step
  welcomeBadge: string;
  welcomeHeading: string;
  welcomeSubtitle: string;
  welcomeAudioButton: string;
  welcomeNewPatientTitle: string;
  welcomeNewPatientSub: string;
  welcomeNewPatientDesc: string;
  welcomeNewPatientAction: string;
  welcomeNewPatientBadge: string;
  welcomeReturningTitle: string;
  welcomeReturningSub: string;
  welcomeReturningDesc: string;
  welcomeReturningAction: string;
  welcomeReturningBadge: string;

  // Returning Patient Step
  returningBadge: string;
  returningHeading: string;
  returningSubtitle: string;
  returningAudioButton: string;
  returningInputLabel: string;
  returningInputPlaceholder: string;
  returningKeypadTitle: string;
  returningKeypadDelete: string;
  returningKeypadHyphen: string;
  returningKeypadClear: string;
  returningBack: string;
  returningSubmit: string;
  returningVerifying: string;
  returningErrorEmpty: string;

  // New Patient Step
  newPatientBadge: string;
  newPatientHeading: string;
  newPatientSubtitle: string;
  newPatientAudioButton: string;
  newPatientFullName: string;
  newPatientAge: string;
  newPatientGender: string;
  newPatientGenderMale: string;
  newPatientGenderFemale: string;
  newPatientGenderOther: string;
  newPatientGenderPreferNot: string;
  newPatientPhone: string;
  newPatientCompanionToggle: string;
  newPatientCompanionDesc: string;
  newPatientCompanionName: string;
  newPatientCompanionRel: string;
  newPatientRelSpouse: string;
  newPatientRelParent: string;
  newPatientRelChild: string;
  newPatientRelSibling: string;
  newPatientRelOther: string;
  newPatientRelStaff: string;
  newPatientBack: string;
  newPatientContinue: string;
  newPatientErrorName: string;
  newPatientErrorAge: string;
  newPatientErrorPhone: string;
  newPatientErrorCompanion: string;

  // Language Selection Step
  languageBadge: string;
  languageHeading: string;
  languageSubtitle: string;
  languageAudioButton: string;
  languageBack: string;
  languageContinue: string;
  languageVoiceTouch: string;
  languageTouchOnly: string;

  // Consent Step
  consentBadge: string;
  consentHeading: string;
  consentSubtitle: string;
  consentAudioButton: string;
  consentAudioPrompt: string;
  consentPoint1Title: string;
  consentPoint1Desc: string;
  consentPoint2Title: string;
  consentPoint2Desc: string;
  consentPoint3Title: string;
  consentPoint3Desc: string;
  consentProvidedByLabel: string;
  consentByPatient: string;
  consentByCompanion: string;
  consentByStaff: string;
  consentAgreeCheckbox: string;
  consentBack: string;
  consentSubmit: string;
  consentCreatingSession: string;

  // Ready / Review Step
  readyBadge: string;
  readyHeading: string;
  readySubtitle: string;
  readyRegNumberLabel: string;
  readyVisitIdLabel: string;
  readyPatientNameLabel: string;
  readyContactLabel: string;
  readyContactDesc: string;
  readyLanguageLabel: string;
  readyLanguageDesc: string;
  readyAssistanceLabel: string;
  readySelfRegistered: string;
  readyCompanionAssisted: string;
  readyConsentsLabel: string;
  readyVerifiedBadge: string;
  readyExpiryNotice: string;
  readyEndSessionButton: string;
  readyStartInterviewButton: string;

  // Home Page
  homeSystemBadge: string;
  homeTitle: string;
  homeSubtitle: string;
  homeIntro: string;
  homeSelfIntakeTitle: string;
  homeSelfIntakeDesc: string;
  homeSelfIntakeAction: string;
  homeAssistedTitle: string;
  homeAssistedDesc: string;
  homeAssistedAction: string;
  homeMobileEntryBadge: string;
  homeMobileEntryTitle: string;
  homeMobileEntryDesc: string;
  homeMobileEntryAction: string;
  homeSafetyNoticeTitle: string;
  homeSafetyNoticeDesc: string;
  homeBackendApiLabel: string;
  homeCheckingHealth: string;
  homeServerOffline: string;
  homeServerConnected: string;
}

export const translations: Record<'en' | 'ta', AppTranslations> = {
  en: {
    // Global / Layout
    platformTitle: 'THUNAI',
    platformSubtitle: 'Healthcare Assistance & Case-Taking Platform',
    opdBadge: 'OPD Pre-Consultation',
    demoBanner: 'DEMONSTRATION — synthetic data',
    guideButton: 'Guide',
    helpButton: 'I Need Help',
    accessibilityButton: 'Accessibility Modes',
    footerNotice: 'Voice and touch supported. For attendant assistance, visit Counter #1.',

    // Help Modal
    helpModalTitle: 'Need Immediate Help?',
    helpModalSubtitle: 'A hospital staff attendant will come to your kiosk.',
    helpReasonPrompt: 'Quickly select a reason (optional):',
    helpReasonUnwell: 'Feeling very unwell',
    helpReasonPain: 'Severe acute pain',
    helpReasonScreen: 'Difficulty with screen',
    helpReasonCompanion: 'Need assistant or companion',
    helpCancel: 'Cancel',
    helpCallStaff: 'Call Staff Now',
    helpCalling: 'Calling Staff...',
    helpSuccessTitle: 'Help is on the way!',
    helpSuccessMessage: 'Staff attendant from OPD Counter #1 has been notified. Please stay here at the kiosk.',
    helpSuccessButton: 'OK, I will wait',

    // Accessibility Modal
    a11yModalTitle: 'Accessibility & Visual Modes',
    a11yModalSubtitle: 'Customize kiosk controls, audio volume, text size, and timeouts',
    a11yDoneButton: 'Apply Settings',
    a11yStandardTitle: 'Standard Touch & Voice',
    a11yStandardDesc: 'Default hospital layout with touch controls and optional voice prompts.',
    a11yHighContrastTitle: 'Large Text & High Contrast',
    a11yHighContrastDesc: 'Bold high-contrast borders and extra-large fonts for elderly or vision impairment.',
    a11yHighContrastBadge: 'Vision Friendly',
    a11yVoiceFirstTitle: 'Voice-First Mode',
    a11yVoiceFirstDesc: 'Questions read automatically; spoken answers prioritized with voice confirmation.',
    a11yVoiceFirstBadge: 'Hands-Free',
    a11yTouchCaptionsTitle: 'Touch-Only with Captions',
    a11yTouchCaptionsDesc: 'Audio muted; complete closed captions displayed for all spoken hints. Ideal for noisy OPDs.',
    a11yTouchCaptionsBadge: 'Hearing Friendly',
    a11ySimplifiedTitle: 'Simplified Layout',
    a11ySimplifiedDesc: 'One large question at a time, minimal controls, and high-visibility icons.',
    a11ySimplifiedBadge: 'Low Cognitive Load',
    a11ySlowerPaceTitle: 'Slower Pace (Extended Timeouts)',
    a11ySlowerPaceDesc: 'Triple inactivity timeouts (300s) and slower, relaxed speech rate.',
    a11ySlowerPaceBadge: 'Elderly Friendly',

    // Inactivity Modal
    timeoutTitle: 'Are You Still There?',
    timeoutMessage: 'For patient privacy, your session will automatically reset in {seconds} seconds.',
    timeoutContinueButton: "I'm Still Here (Continue)",

    // Wizard Steps
    stepWelcome: '1. Welcome',
    stepIdentity: '2. Identity',
    stepLanguage: '3. Language',
    stepConsent: '4. Consent',
    stepReady: '5. Ready',

    // Welcome Step
    welcomeBadge: 'Automated OPD Case-Taking & Triage',
    welcomeHeading: 'Welcome to Hospital Outpatient Kiosk',
    welcomeSubtitle: 'Hospital Outpatient Department — Register your details to consult your physician.',
    welcomeAudioButton: 'Listen Voice Instructions',
    welcomeNewPatientTitle: 'New Patient',
    welcomeNewPatientSub: 'First-time hospital visit',
    welcomeNewPatientDesc: 'First time visiting this hospital. Enter basic demographic information to receive your hospital registration number.',
    welcomeNewPatientAction: 'Start New Registration →',
    welcomeNewPatientBadge: 'No password needed',
    welcomeReturningTitle: 'Returning Patient',
    welcomeReturningSub: 'Already registered at this hospital',
    welcomeReturningDesc: 'Already have a hospital registration card or patient registration number (e.g. MK-2026-XXXXXX).',
    welcomeReturningAction: 'Enter Hospital ID →',
    welcomeReturningBadge: 'Fast lookup',

    // Returning Patient Step
    returningBadge: 'Returning Patient Lookup',
    returningHeading: 'Enter Hospital Registration Number',
    returningSubtitle: 'Type the ID printed on your OPD card or past hospital slip (e.g. MK-2026-894123).',
    returningAudioButton: 'Listen Voice Instructions',
    returningInputLabel: 'Hospital Registration Number (UHID)',
    returningInputPlaceholder: 'MK-2026-123456',
    returningKeypadTitle: 'Touch Keypad',
    returningKeypadDelete: 'Delete ⌫',
    returningKeypadHyphen: 'Add Hyphen (-)',
    returningKeypadClear: 'Clear All',
    returningBack: '← Back',
    returningSubmit: 'Look Up Patient Record →',
    returningVerifying: 'Verifying...',
    returningErrorEmpty: 'Please enter your hospital registration number.',

    // New Patient Step
    newPatientBadge: 'Patient Identity & Demographics',
    newPatientHeading: 'Basic Patient Information',
    newPatientSubtitle: 'Minimal essential details required to begin your hospital case intake.',
    newPatientAudioButton: 'Listen Voice Instructions',
    newPatientFullName: 'Full Name',
    newPatientAge: 'Age (Years)',
    newPatientGender: 'Gender',
    newPatientGenderMale: 'Male',
    newPatientGenderFemale: 'Female',
    newPatientGenderOther: 'Other',
    newPatientGenderPreferNot: 'Prefer not to say',
    newPatientPhone: 'Phone Number',
    newPatientCompanionToggle: 'Assisted Registration (Family or Staff)',
    newPatientCompanionDesc: 'Enable if a family member, caregiver, or hospital attendant is assisting this registration.',
    newPatientCompanionName: 'Assisting Person Name',
    newPatientCompanionRel: 'Relationship to Patient',
    newPatientRelSpouse: 'Spouse (Husband or Wife)',
    newPatientRelParent: 'Parent (Father or Mother)',
    newPatientRelChild: 'Child (Son or Daughter)',
    newPatientRelSibling: 'Brother or Sister',
    newPatientRelOther: 'Other Relative or Friend',
    newPatientRelStaff: 'Hospital Staff Attendant',
    newPatientBack: '← Back',
    newPatientContinue: 'Continue to Language Selection →',
    newPatientErrorName: 'Please provide patient full name (at least 2 characters).',
    newPatientErrorAge: 'Please provide a valid age between 0 and 130.',
    newPatientErrorPhone: 'Please provide a valid contact phone number.',
    newPatientErrorCompanion: 'Please provide the assisting companion or staff attendant name.',

    // Language Selection Step
    languageBadge: 'Language Preference',
    languageHeading: 'Choose Interview Language',
    languageSubtitle: 'All questions, voice prompts, and summaries will be presented in your chosen language.',
    languageAudioButton: 'Listen Audio',
    languageBack: '← Back to Demographics',
    languageContinue: 'Confirm & Proceed to Consent →',
    languageVoiceTouch: 'Voice & Touch',
    languageTouchOnly: 'Touch-Only',

    // Consent Step
    consentBadge: 'Patient Consent & Privacy',
    consentHeading: 'Consent for Case-Taking & Care',
    consentSubtitle: 'Simple and transparent consent for your outpatient visit and clinical assistance.',
    consentAudioButton: 'Read Aloud',
    consentAudioPrompt: 'Please review the clinical intake consent. Your data is strictly used for your hospital care and shared only with your treating doctor.',
    consentPoint1Title: 'OPD Visit Data Collection',
    consentPoint1Desc: 'We collect your basic demographics and symptom answers to create your clinical intake record for today’s hospital visit.',
    consentPoint2Title: 'AI Clinical Case-Taking Assistant',
    consentPoint2Desc: 'An AI assistant will organize your symptoms into a structured draft for the doctor. The AI does not diagnose or prescribe medicine.',
    consentPoint3Title: 'Doctor Sharing & Review',
    consentPoint3Desc: 'Your answers will be securely transferred to your treating OPD physician who will verify and confirm all medical decisions.',
    consentProvidedByLabel: 'Consent Provided By:',
    consentByPatient: 'Patient Themselves',
    consentByCompanion: 'Companion or Family Member',
    consentByStaff: 'Hospital Staff Attendant on Behalf',
    consentAgreeCheckbox: 'I understand and give consent to proceed with this OPD intake session.',
    consentBack: '← Back',
    consentSubmit: 'I Agree & Start Visit →',
    consentCreatingSession: 'Creating Session...',

    // Ready / Review Step
    readyBadge: 'Registration Completed',
    readyHeading: 'Review Your Registration',
    readySubtitle: 'Your profile has been created for today’s OPD visit. Confirm your details below.',
    readyRegNumberLabel: 'Hospital Registration Number',
    readyVisitIdLabel: 'Visit ID',
    readyPatientNameLabel: 'Patient Name & Demographics',
    readyContactLabel: 'Contact Number',
    readyContactDesc: 'Registered for OPD triage notifications',
    readyLanguageLabel: 'Selected Language',
    readyLanguageDesc: 'Interview and prompts adapted',
    readyAssistanceLabel: 'Assistance Mode',
    readySelfRegistered: 'Self Registered',
    readyCompanionAssisted: 'Companion Assisted',
    readyConsentsLabel: 'Active Consents for this Visit',
    readyVerifiedBadge: 'Verified & Auditable',
    readyExpiryNotice: 'Visit-scoped session valid for 1 hour. All data is isolated to this visit.',
    readyEndSessionButton: 'End Session & Exit',
    readyStartInterviewButton: 'Begin Guided Interview →',

    // Home Page
    homeSystemBadge: 'Hospital OPD Pre-Consultation System',
    homeTitle: 'Welcome to THUNAI',
    homeSubtitle: 'Healthcare Assistance, Made More Accessible',
    homeIntro: 'Please complete your medical case intake before meeting the doctor. Your answers and past prescriptions will help your physician prepare your consultation.',
    homeSelfIntakeTitle: 'Self Intake (Patient)',
    homeSelfIntakeDesc: 'Answer clear, simple questions by voice or touch. You can scan past prescriptions and lab reports at the next step.',
    homeSelfIntakeAction: 'Start Patient Intake',
    homeAssistedTitle: 'Companion / Staff Assisted',
    homeAssistedDesc: 'Family members, companions, or hospital OPD staff attendants can help enter patient information together.',
    homeAssistedAction: 'Assisted Intake Mode',
    homeMobileEntryBadge: 'Standalone Remote Entry',
    homeMobileEntryTitle: 'Prefer Using Your Own Smartphone?',
    homeMobileEntryDesc: 'Skip waiting at the terminal! Open the mobile patient portal on your phone to upload prescriptions directly from your camera and answer intake questions at your own pace.',
    homeMobileEntryAction: 'Open Mobile Portal',
    homeSafetyNoticeTitle: 'Trust & Clinical Safety Assurance',
    homeSafetyNoticeDesc: 'THUNAI assists in organizing patient information into a structured summary. It does not diagnose or prescribe. The treating physician always reviews, edits, and confirms your clinical record.',
    homeBackendApiLabel: 'Clinical Backend API:',
    homeCheckingHealth: 'Checking health...',
    homeServerOffline: 'Server Offline (Verify backend on :5001)',
    homeServerConnected: 'Connected',
  },

  ta: {
    // Global / Layout
    platformTitle: 'துணை (THUNAI)',
    platformSubtitle: 'மருத்துவ உதவி மற்றும் வழக்கு-பதிவு தளம்',
    opdBadge: 'வெளிநோயாளி முன்-ஆலோசனை',
    demoBanner: 'செயற்கை மாதிரி தரவு — செயல்முறை விளக்கம்',
    guideButton: 'வழிகாட்டி',
    helpButton: 'உதவி தேவை',
    accessibilityButton: 'அணுகல்தன்மை முறைகள்',
    footerNotice: 'குரல் மற்றும் தொடுதிரை ஆதரவு. நேரடி உதவிக்கு கவுண்டர் #1-ஐ அணுகவும்.',

    // Help Modal
    helpModalTitle: 'உடனடி உதவி தேவையா?',
    helpModalSubtitle: 'மருத்துவமனை பணியாளர் ஒருவர் உங்கள் கியோஸ்க்கிற்கு நேரில் வருவார்.',
    helpReasonPrompt: 'உதவிக்கான காரணத்தைத் தேர்ந்தெடுக்கவும் (விருப்பத்தேர்வு):',
    helpReasonUnwell: 'உடல்நிலை மிகவும் சரியில்லை அல்லது மயக்கம்',
    helpReasonPain: 'கடுமையான திடீர் வலி',
    helpReasonScreen: 'திரையைப் பயன்படுத்துவதில் சிரமம்',
    helpReasonCompanion: 'உதவியாளர் அல்லது துணை தேவை',
    helpCancel: 'ரத்து செய்',
    helpCallStaff: 'பணியாளரை உடனே அழைக்கவும்',
    helpCalling: 'பணியாளர் அழைக்கப்படுகிறார்...',
    helpSuccessTitle: 'உதவி விரைந்து வருகிறது!',
    helpSuccessMessage: 'கவுண்டர் #1-ல் உள்ள பணியாளருக்கு தகவல் அனுப்பப்பட்டுள்ளது. தயவுசெய்து கியோஸ்க்கிலேயே காத்திருக்கவும்.',
    helpSuccessButton: 'சரி, காத்திருக்கிறேன்',

    // Accessibility Modal
    a11yModalTitle: 'அணுகல்தன்மை மற்றும் காட்சி முறைகள்',
    a11yModalSubtitle: 'கியோஸ்க் திரைக் கட்டுப்பாடுகள், ஒலி அளவு, எழுத்து அளவு மற்றும் நேரத்தை மாற்றவும்',
    a11yDoneButton: 'அமைப்புகளைப் பயன்படுத்து',
    a11yStandardTitle: 'இயல்பான தொடுதிரை & குரல்',
    a11yStandardDesc: 'தொடுதிரை மற்றும் குரல் வழிகாட்டுதலுடன் கூடிய இயல்பான மருத்துவமனை அமைப்பு.',
    a11yHighContrastTitle: 'பெரிய எழுத்து & உயர் மாறுபாடு',
    a11yHighContrastDesc: 'பார்வைக் குறைபாடு அல்லது முதியவர்களுக்கான பெரிய எழுத்துகள் மற்றும் தெளிவான எல்லைகள்.',
    a11yHighContrastBadge: 'பார்வைக்கு ஏற்றது',
    a11yVoiceFirstTitle: 'குரல்-முதன்மை முறை',
    a11yVoiceFirstDesc: 'கேள்விகள் தானாக வாசிக்கப்படும்; உங்கள் குரல் பதில்களுக்கு முன்னுரிமை அளிக்கப்படும்.',
    a11yVoiceFirstBadge: 'தொடுதிரை தேவையில்லை',
    a11yTouchCaptionsTitle: 'விளக்கக் குறிப்புகளுடன் தொடுதிரை',
    a11yTouchCaptionsDesc: 'ஒலி முடக்கப்பட்டு, திரையில் தெளிவான வாக்கியங்கள் தோன்றும். இரைச்சல் மிகுந்த இடங்களுக்கு ஏற்றது.',
    a11yTouchCaptionsBadge: 'செவித்திறனுக்கு ஏற்றது',
    a11ySimplifiedTitle: 'எளிமைப்படுத்தப்பட்ட வடிவம்',
    a11ySimplifiedDesc: 'ஒரு நேரத்தில் ஒரு பெரிய கேள்வி, எளிய தேர்வுகள் மற்றும் தெளிவான குறியீடுகள்.',
    a11ySimplifiedBadge: 'மிகவும் எளிதானது',
    a11ySlowerPaceTitle: 'மெதுவான வேகம் (கூடுதல் நேரம்)',
    a11ySlowerPaceDesc: 'நீட்டிக்கப்பட்ட கால அவகாசம் (300 வினாடிகள்) மற்றும் நிதானமான பேச்சு வேகம்.',
    a11ySlowerPaceBadge: 'முதியவர்களுக்கு ஏற்றது',

    // Inactivity Modal
    timeoutTitle: 'நீங்கள் இன்னும் இருக்கிறீர்களா?',
    timeoutMessage: 'தனிநபர் தகவல் பாதுகாப்பிற்காக திரை {seconds} வினாடிகளில் தானாக மீட்டமைக்கப்படும்.',
    timeoutContinueButton: 'தொடரவும் (இங்கே இருக்கிறேன்)',

    // Wizard Steps
    stepWelcome: '1. வரவேற்பு',
    stepIdentity: '2. அடையாளம்',
    stepLanguage: '3. மொழி',
    stepConsent: '4. ஒப்புதல்',
    stepReady: '5. தயார்',

    // Welcome Step
    welcomeBadge: 'தானியங்கி வெளிநோயாளி வழக்கு-பதிவு',
    welcomeHeading: 'மருத்துவமனை வெளிநோயாளி கியோஸ்க்கிற்கு நல்வரவு',
    welcomeSubtitle: 'மருத்துவமனை வெளிநோயாளி பிரிவு — உங்கள் விவரங்களை பதிவு செய்து மருத்துவரை அணுகவும்.',
    welcomeAudioButton: 'குரல் வழிகாட்டுதலைக் கேட்கவும்',
    welcomeNewPatientTitle: 'புதிய நோயாளி',
    welcomeNewPatientSub: 'முதல் முறை மருத்துவமனை வருகை',
    welcomeNewPatientDesc: 'முதல் முறையாக இந்த மருத்துவமனைக்கு வருகிறீர்கள் எனில், புதிய மருத்துவமனை எண் பெற அடிப்படை விவரங்களை உள்ளிடவும்.',
    welcomeNewPatientAction: 'புதிய பதிவைத் தொடங்கவும் →',
    welcomeNewPatientBadge: 'கடவுச்சொல் தேவையில்லை',
    welcomeReturningTitle: 'ஏற்கனவே பதிவு செய்தவர்',
    welcomeReturningSub: 'மருத்துவமனை அட்டை உள்ளவர்கள்',
    welcomeReturningDesc: 'ஏற்கனவே உங்களிடம் மருத்துவமனை பதிவு அட்டை அல்லது பதிவு எண் இருந்தால் (எ.கா. MK-2026-XXXXXX) இங்கு தொடரவும்.',
    welcomeReturningAction: 'மருத்துவமனை எண்ணை உள்ளிடவும் →',
    welcomeReturningBadge: 'விரைவான தேடல்',

    // Returning Patient Step
    returningBadge: 'ஏற்கனவே பதிவு செய்த நோயாளி தேடல்',
    returningHeading: 'மருத்துவமனை பதிவு எண்ணை உள்ளிடவும்',
    returningSubtitle: 'உங்கள் வெளிநோயாளி அட்டை அல்லது ரசீதில் உள்ள எண்ணைத் தட்டச்சு செய்யவும் (எ.கா. MK-2026-894123).',
    returningAudioButton: 'குரல் வழிகாட்டுதலைக் கேட்கவும்',
    returningInputLabel: 'மருத்துவமனை பதிவு எண் (UHID)',
    returningInputPlaceholder: 'MK-2026-123456',
    returningKeypadTitle: 'தொடு விசைப்பலகை',
    returningKeypadDelete: 'அழி ⌫',
    returningKeypadHyphen: 'இணைப்புக் குறி (-)',
    returningKeypadClear: 'அனைத்தையும் அழி',
    returningBack: '← பின்செல்',
    returningSubmit: 'பதிவைத் தேடவும் →',
    returningVerifying: 'சரிபார்க்கிறது...',
    returningErrorEmpty: 'தயவுசெய்து உங்கள் மருத்துவமனை பதிவு எண்ணை உள்ளிடவும்.',

    // New Patient Step
    newPatientBadge: 'நோயாளி அடையாளம் மற்றும் விவரங்கள்',
    newPatientHeading: 'அடிப்படை நோயாளி விவரங்கள்',
    newPatientSubtitle: 'மருத்துவமனை வழக்கு-பதிவைத் தொடங்க தேவையான அத்தியாவசிய விவரங்கள்.',
    newPatientAudioButton: 'குரல் வழிகாட்டுதலைக் கேட்கவும்',
    newPatientFullName: 'முழு பெயர்',
    newPatientAge: 'வயது (ஆண்டுகள்)',
    newPatientGender: 'பாலினம்',
    newPatientGenderMale: 'ஆண்',
    newPatientGenderFemale: 'பெண்',
    newPatientGenderOther: 'மற்றவை',
    newPatientGenderPreferNot: 'குறிப்பிட விரும்பவில்லை',
    newPatientPhone: 'அலைபேசி எண்',
    newPatientCompanionToggle: 'உடன் வந்தவர் அல்லது உதவியாளர் வழி பதிவு',
    newPatientCompanionDesc: 'குடும்பத்தினர் அல்லது மருத்துவமனை பணியாளர் இந்த பதிவுக்கு உதவுகிறார் என்றால் இதைத் தேர்ந்தெடுக்கவும்.',
    newPatientCompanionName: 'உதவும் நபர் அல்லது பணியாளர் பெயர்',
    newPatientCompanionRel: 'நோயாளியுடனான உறவு முறை',
    newPatientRelSpouse: 'மனைவி அல்லது கணவர்',
    newPatientRelParent: 'தாய் அல்லது தந்தை',
    newPatientRelChild: 'மகன் அல்லது மகள்',
    newPatientRelSibling: 'உடன்பிறப்பு',
    newPatientRelOther: 'உறவினர் அல்லது நண்பர்',
    newPatientRelStaff: 'மருத்துவமனை பணியாளர்',
    newPatientBack: '← பின்செல்',
    newPatientContinue: 'மொழித் தேர்வுக்குத் தொடரவும் →',
    newPatientErrorName: 'நோயாளியின் முழு பெயரை உள்ளிடவும் (குறைந்தது 2 எழுத்துகள்).',
    newPatientErrorAge: '0 முதல் 130 வரை சரியான வயதை உள்ளிடவும்.',
    newPatientErrorPhone: 'சரியான அலைபேசி எண்ணை உள்ளிடவும்.',
    newPatientErrorCompanion: 'உதவும் நபர் அல்லது பணியாளரின் பெயரை உள்ளிடவும்.',

    // Language Selection Step
    languageBadge: 'விருப்பமான மொழி',
    languageHeading: 'நேர்காணல் மொழியைத் தேர்ந்தெடுக்கவும்',
    languageSubtitle: 'அனைத்து கேள்விகள், குரல் வழிகாட்டுதல்கள் மற்றும் சுருக்கங்கள் உங்கள் விருப்ப மொழியில் வழங்கப்படும்.',
    languageAudioButton: 'ஆடியோ கேட்கவும்',
    languageBack: '← விவரங்களுக்குத் திரும்பு',
    languageContinue: 'உறுதி செய்து ஒப்புதலுக்குச் செல்லவும் →',
    languageVoiceTouch: 'குரல் & தொடுதிரை',
    languageTouchOnly: 'தொடுதிரை மட்டும்',

    // Consent Step
    consentBadge: 'நோயாளி ஒப்புதல் மற்றும் தனியுரிமை',
    consentHeading: 'வழக்கு-பதிவு மற்றும் சிகிச்சைக்கான ஒப்புதல்',
    consentSubtitle: 'உங்கள் வெளிநோயாளி வருகை மற்றும் மருத்துவ உதவிக்கான எளிய மற்றும் வெளிப்படையான ஒப்புதல்.',
    consentAudioButton: 'வாசித்து கேட்கவும்',
    consentAudioPrompt: 'மருத்துவமனை வழக்கு-பதிவு ஒப்புதலை கவனிக்கவும். உங்கள் விவரங்கள் உங்கள் சிகிச்சைக்காக மட்டுமே பயன்படுத்தப்பட்டு, உங்கள் மருத்துவரிடம் மட்டுமே பகிரப்படும்.',
    consentPoint1Title: 'வெளிநோயாளி வருகை தரவு சேகரிப்பு',
    consentPoint1Desc: 'இன்றைய மருத்துவமனை வருகைக்கான மருத்துவ பதிவை உருவாக்க உங்கள் அடிப்படை விவரங்களையும் அறிகுறிகளையும் சேகரிக்கிறோம்.',
    consentPoint2Title: 'செயற்கை நுண்ணறிவு மருத்துவ உதவியாளர்',
    consentPoint2Desc: 'செயற்கை நுண்ணறிவு உதவியாளர் உங்கள் அறிகுறிகளை மருத்துவருக்காக ஒழுங்கமைக்கும். இது நோய் கண்டறிதல் அல்லது மருந்து பரிந்துரை செய்யாது.',
    consentPoint3Title: 'மருத்துவரிடம் பகிர்தல் மற்றும் மதிப்பாய்வு',
    consentPoint3Desc: 'உங்கள் பதில்கள் உங்கள் மருத்துவரிடம் பாதுகாப்பாக மாற்றப்படும், அவர் அனைத்து மருத்துவ முடிவுகளையும் சரிபார்த்து உறுதி செய்வார்.',
    consentProvidedByLabel: 'ஒப்புதல் அளிப்பவர்:',
    consentByPatient: 'நோயாளி நேரடியாக',
    consentByCompanion: 'உடன் வந்த குடும்பத்தினர்',
    consentByStaff: 'மருத்துவமனை பணியாளர் சார்பாக',
    consentAgreeCheckbox: 'நான் விவரங்களைப் புரிந்துகொண்டு இந்த வெளிநோயாளி அமர்வைத் தொடர ஒப்புதல் அளிக்கிறேன்.',
    consentBack: '← பின்செல்',
    consentSubmit: 'ஒப்புக்கொண்டு வருகையைத் தொடங்கவும் →',
    consentCreatingSession: 'அமர்வு தொடங்கப்படுகிறது...',

    // Ready / Review Step
    readyBadge: 'பதிவு வெற்றிகரமாக முடிந்தது',
    readyHeading: 'உங்கள் பதிவை மதிப்பாய்வு செய்யவும்',
    readySubtitle: 'இன்றைய வெளிநோயாளி வருகைக்கான சுயவிவரம் உருவாக்கப்பட்டுள்ளது. விவரங்களை உறுதிப்படுத்தவும்.',
    readyRegNumberLabel: 'மருத்துவமனை பதிவு எண்',
    readyVisitIdLabel: 'வருகை குறியீடு',
    readyPatientNameLabel: 'நோயாளி பெயர் மற்றும் விவரங்கள்',
    readyContactLabel: 'தொடர்பு எண்',
    readyContactDesc: 'மருத்துவமனை அறிவிப்புகளுக்காக பதிவு செய்யப்பட்டது',
    readyLanguageLabel: 'தேர்ந்தெடுக்கப்பட்ட மொழி',
    readyLanguageDesc: 'கேள்விகள் இந்த மொழியில் அமைக்கப்பட்டன',
    readyAssistanceLabel: 'உதவி முறை',
    readySelfRegistered: 'சுய பதிவு',
    readyCompanionAssisted: 'உதவியாளர் வழி பதிவு',
    readyConsentsLabel: 'இவ்வருகைக்கான செயலில் உள்ள ஒப்புதல்கள்',
    readyVerifiedBadge: 'சரிபார்க்கப்பட்டது',
    readyExpiryNotice: 'இவ்வமர்வு 1 மணிநேரம் செல்லுபடியாகும். அனைத்து தரவுகளும் பாதுகாப்பாக இருக்கும்.',
    readyEndSessionButton: 'அமர்வை முடித்து வெளியேறு',
    readyStartInterviewButton: 'மருத்துவ நேர்காணலைத் தொடங்கு →',

    // Home Page
    homeSystemBadge: 'மருத்துவமனை வெளிநோயாளி முன்-ஆலோசனை அமைப்பு',
    homeTitle: 'துணை (THUNAI)-க்கு நல்வரவு',
    homeSubtitle: 'மருத்துவ உதவி, அனைவருக்கும் எளிதாக',
    homeIntro: 'மருத்துவரை சந்திப்பதற்கு முன் உங்கள் மருத்துவ விவரங்களை பதிவு செய்யவும். உங்கள் பதில்களும் முந்தைய மருந்துச் சீட்டுகளும் மருத்துவருக்கு பெரிதும் உதவும்.',
    homeSelfIntakeTitle: 'நோயாளி சுய பதிவு',
    homeSelfIntakeDesc: 'குரல் அல்லது தொடுதிரை மூலம் எளிய கேள்விகளுக்கு பதிலளிக்கவும். முந்தைய மருந்துச் சீட்டுகளையும் ஆய்வக அறிக்கைகளையும் பதிவேற்றலாம்.',
    homeSelfIntakeAction: 'நோயாளி பதிவைத் தொடங்கவும்',
    homeAssistedTitle: 'உடன் வந்தவர் அல்லது பணியாளர் வழி பதிவு',
    homeAssistedDesc: 'குடும்பத்தினர், நண்பர்கள் அல்லது மருத்துவமனை பணியாளர்கள் நோயாளிக்கு பதிலாக விவரங்களை பதிவு செய்யலாம்.',
    homeAssistedAction: 'உதவியாளர் பதிவு முறை',
    homeMobileEntryBadge: 'நேரடி மொபைல் தளம்',
    homeMobileEntryTitle: 'உங்கள் சொந்த மொபைல் போனைப் பயன்படுத்த விரும்புகிறீர்களா?',
    homeMobileEntryDesc: 'கியோஸ்க்கில் வரிசையில் நிற்க வேண்டாம்! உங்கள் மொபைல் போனிலேயே கேமரா மூலம் மருந்துச் சீட்டுகளை பதிவேற்றி உங்கள் வேகத்தில் பதிலளிக்கலாம்.',
    homeMobileEntryAction: 'மொபைல் தளத்தைத் திறக்கவும்',
    homeSafetyNoticeTitle: 'மருத்துவ பாதுகாப்பு மற்றும் நம்பகத்தன்மை உறுதி',
    homeSafetyNoticeDesc: 'துணை (THUNAI) உங்கள் தகவல்களை ஒழுங்கமைக்க மட்டுமே உதவுகிறது. இது நோய் கண்டறிதல் அல்லது மருந்து வழங்குவதில்லை. உங்கள் மருத்துவரே அனைத்தையும் சரிபார்த்து இறுதி முடிவை எடுப்பார்.',
    homeBackendApiLabel: 'மருத்துவ பின்தள சேவையகம்:',
    homeCheckingHealth: 'நிலை சரிபார்க்கப்படுகிறது...',
    homeServerOffline: 'சேவையகம் இயங்கவில்லை (Backend :5001 ஐ சரிபார்க்கவும்)',
    homeServerConnected: 'இணைக்கப்பட்டது',
  },
};
