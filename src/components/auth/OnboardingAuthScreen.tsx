import React, { useState } from 'react';
import {
  Store,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  Check,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Mail,
  Lock,
  KeyRound,
  Layers,
  Sparkles,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  ChevronDown,
  MapPin,
  Building,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { CommodityCategory, WeightUnit } from '../../types';
import { sounds } from '../../utils/audio';
import { COMMODITY_CONFIGS, DEFAULT_MARKET_YARD_NAME, ALL_COMMODITIES } from '../../data/initialData';
import { validateIndianMobile, cleanIndianMobile } from '../../utils/phoneValidation';
import { sendPhoneOtp, verifyPhoneOtp, isSupabaseConfigured } from '../../services/supabase';
import { fetchUserAccountByPhone } from '../../services/firestoreSync';
import {
  checkUserOnServer,
  checkUsernameOnServer,
  sendOtpOnServer,
  verifyOtpOnServer,
  registerPasswordOnServer,
  resetPasswordOnServer,
  loginOnServer,
  getSavedProfilesFromDevice,
  saveProfileToDevice,
  removeProfileFromDevice,
} from '../../services/serverAuth';
import { isWeakPin, isValidUsername } from '../../utils/cryptoUtils';

type AuthViewMode = 'login' | 'signup' | 'forgot-password';
type SignupStep = 'details' | 'otp' | 'commodities';
type AuthMethod = 'phone' | 'email';

const INDIAN_STATES = [
  'Telangana',
  'Andhra Pradesh',
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Gujarat',
  'Uttar Pradesh',
  'Punjab',
  'Haryana',
  'Madhya Pradesh',
  'Rajasthan',
  'West Bengal',
  'Kerala',
  'Bihar',
  'Odisha',
  'Delhi Market Yard',
  'Assam',
  'Other State',
];

interface SignupTranslations {
  merchantSignUp: string;
  stepOf4: (current: number) => string;
  heading: string;
  subtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  step4Title: string;
  step4Desc: string;

  fullNameLabel: string;
  mobileLabel: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  shopNameLabel: string;
  shopNumberLabel: string;
  stateLabel: string;
  marketYardLabel: string;
  shopAddressLabel: string;

  fullNamePlaceholder: string;
  mobilePlaceholder: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  shopNamePlaceholder: string;
  shopNumberPlaceholder: string;
  marketYardPlaceholder: string;
  shopAddressPlaceholder: string;

  btnNext: string;
  btnBack: string;
  btnGetOtp: string;
  alreadyHaveAccount: string;
  loginLink: string;

  errFullNameRequired: string;
  errFullNameNoNumbers: string;
  errPhoneRequired: string;
  errPasswordMinLength: string;
  errPasswordMismatch: string;
  errShopNameRequired: string;
  errMarketYardRequired: string;
  errShopAddressRequired: string;

  otpHeading: string;
  otpSubtitle: (phone: string) => string;
  btnVerifyOtp: string;
  commodityHeading: string;
  commoditySubtitle: string;
  btnCompleteSignup: string;
}

const SIGNUP_TRANSLATIONS: Record<string, SignupTranslations> = {
  en: {
    merchantSignUp: 'Merchant Sign Up',
    stepOf4: (current) => `Step ${current} of 4`,
    heading: 'Create Your Mandi Merchant Account',
    subtitle: 'Register your wholesale mandi shop in easy step-by-step process',
    step1Title: 'Personal Details',
    step1Desc: 'Enter your full name and 10-digit mobile number',
    step2Title: 'Password',
    step2Desc: 'Set a secure login password for your merchant account',
    step3Title: 'Shop Details',
    step3Desc: 'Provide your registered shop / firm name and stall number',
    step4Title: 'Market Details',
    step4Desc: 'Select your state, market yard, and shop address',

    fullNameLabel: 'Full Name (Owner / Trader) *',
    mobileLabel: 'Mobile Number (10 Digits) *',
    emailLabel: 'Email Address (Optional)',
    passwordLabel: 'Create Log In Password *',
    confirmPasswordLabel: 'Re-enter Password to Confirm *',
    shopNameLabel: 'Shop / Firm Name *',
    shopNumberLabel: 'Shop / Stall Number',
    stateLabel: 'State *',
    marketYardLabel: 'Market Yard / Mandi Name *',
    shopAddressLabel: 'Shop / Yard Full Address *',

    fullNamePlaceholder: 'e.g. Ramesh Kumar',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'e.g. ramesh@manditrader.com',
    passwordPlaceholder: 'Set password for future logins',
    confirmPasswordPlaceholder: 'Re-enter same password',
    shopNamePlaceholder: 'e.g. Sri Venkateswara Trading Co.',
    shopNumberPlaceholder: 'e.g. Stall #27, Gate 3',
    marketYardPlaceholder: 'e.g. Wholesale Market Yard',
    shopAddressPlaceholder: 'e.g. Shop #1, Gate 2, Market Yard',

    btnNext: 'Next',
    btnBack: 'Back',
    btnGetOtp: 'Get One-Time Verification OTP',
    alreadyHaveAccount: 'Already have an account?',
    loginLink: 'Log In',

    errFullNameRequired: 'Please enter your full name',
    errFullNameNoNumbers: 'Full name cannot contain numbers',
    errPhoneRequired: 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)',
    errPasswordMinLength: 'Password must be at least 4 characters long',
    errPasswordMismatch: 'Passwords do not match! Please re-enter the exact same password.',
    errShopNameRequired: 'Please enter your shop or firm name',
    errMarketYardRequired: 'Please enter your market yard or mandi name',
    errShopAddressRequired: 'Please enter your shop address',

    otpHeading: 'One-Time Verification OTP',
    otpSubtitle: (phone) => `Enter the 4-digit verification code sent to +91 ${phone}`,
    btnVerifyOtp: 'Verify OTP Code & Select Commodity',
    commodityHeading: 'Select Commodity Types You Trade',
    commoditySubtitle: 'Choose the crops and produce you handle in the market',
    btnCompleteSignup: 'Complete Mandi Sign Up',
  },
  te: {
    merchantSignUp: 'వ్యాపారి సైన్ అప్',
    stepOf4: (current) => `దశ ${current} / 4`,
    heading: 'మీ మండి వ్యాపారి ఖాతాను సృష్టించండి',
    subtitle: 'సులభమైన దశలవారీ ప్రక్రియలో మీ టోకు మండి దుకాణాన్ని నమోదు చేయండి',
    step1Title: 'వ్యక్తిగత వివరాలు',
    step1Desc: 'మీ పూర్తి పేరు మరియు మొబైల్ సంఖ్యను నమోదు చేయండి',
    step2Title: 'పాస్‌వర్డ్',
    step2Desc: 'మీ ఖాతా కోసం సురక్షితమైన లాగిన్ పాస్‌వర్డ్‌ను సెట్ చేయండి',
    step3Title: 'దుకాణం వివరాలు',
    step3Desc: 'మీ దుకాణం లేదా సంస్థ పేరు మరియు స్టాల్ సంఖ్యను అందించండి',
    step4Title: 'మార్కెట్ వివరాలు',
    step4Desc: 'మీ Mandi మార్కెట్ యార్డ్, రాష్ట్రం మరియు చిరునామాను ఎంచుకోండి',

    fullNameLabel: 'పూర్తి పేరు (యజమాని / వ్యాపారి) *',
    mobileLabel: 'మొబైల్ సంఖ్య (10 అంకెలు) *',
    emailLabel: 'ఇమెయిల్ చిరునామా (ఐచ్ఛికం)',
    passwordLabel: 'లాగిన్ పాస్‌వర్డ్‌ను సృష్టించండి *',
    confirmPasswordLabel: 'సృష్టించిన పాస్‌వర్డ్‌ను సరిచూడండి *',
    shopNameLabel: 'దుకాణం / సంస్థ పేరు *',
    shopNumberLabel: 'దుకాణం / స్టాల్ సంఖ్య',
    stateLabel: 'రాష్ట్రం *',
    marketYardLabel: 'మార్కెట్ యార్డ్ / మండి పేరు *',
    shopAddressLabel: 'దుకాణం / యార్డ్ పూర్తి చిరునామా *',

    fullNamePlaceholder: 'ఉదా. రమేష్ కుమార్',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'ఉదా. ramesh@manditrader.com',
    passwordPlaceholder: 'భవిష్యత్ లాగిన్‌ల కోసం పాస్‌వర్డ్ సెట్ చేయండి',
    confirmPasswordPlaceholder: 'అదే పాస్‌వర్డ్‌ను మళ్లీ నమోదు చేయండి',
    shopNamePlaceholder: 'ఉదా. శ్రీ వేంకటేశ్వర ట్రేడింగ్ కంపెనీ',
    shopNumberPlaceholder: 'ఉదా. స్టాల్ #27, గేట్ 3',
    marketYardPlaceholder: 'ఉదా. హోల్‌సేల్ మార్కెట్ యార్డ్',
    shopAddressPlaceholder: 'ఉదా. షాప్ #1, గేట్ 2, మార్కెట్ యార్డ్',

    btnNext: 'తరువాత',
    btnBack: 'వెనుకకు',
    btnGetOtp: 'వన్‌టైమ్ వెరిఫికేషన్ OTP పొందండి',
    alreadyHaveAccount: 'ఇప్పటికే ఖాతా ఉందా?',
    loginLink: 'లాగిన్ అవ్వండి',

    errFullNameRequired: 'దయచేసి మీ పూర్తి పేరును నమోదు చేయండి',
    errFullNameNoNumbers: 'పూర్తి పేరులో అంకెలు ఉండకూడదు',
    errPhoneRequired: 'చెల్లుబాటు అయ్యే 10 అంకెల భారతీయ మొబైల్ సంఖ్యను నమోదు చేయండి (6, 7, 8, లేదా 9 తో ప్రారంభం కావాలి)',
    errPasswordMinLength: 'పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి',
    errPasswordMismatch: 'పాస్‌వర్డ్‌లు సరిపోలలేదు! దయచేసి రెండు చోట్లా ఒకే పాస్‌వర్డ్‌ను నమోదు చేయండి.',
    errShopNameRequired: 'దయచేసి మీ దుకాణం లేదా సంస్థ పేరును నమోదు చేయండి',
    errMarketYardRequired: 'దయచేసి మీ మార్కెట్ యార్డ్ లేదా మండి పేరును నమోదు చేయండి',
    errShopAddressRequired: 'దయచేసి మీ దుకాణం చిరునామాను నమోదు చేయండి',

    otpHeading: 'వన్‌టైమ్ వెరిఫికేషన్ OTP',
    otpSubtitle: (phone) => `+91 ${phone} కి పంపిన 6-అంకెల కోడ్‌ను నమోదు చేయండి`,
    btnVerifyOtp: 'OTP సరిచూడండి & కొనసాగండి',
    commodityHeading: 'మీరు వ్యాపారం చేసే సరుకుల రకాలను ఎంచుకోండి',
    commoditySubtitle: 'మార్కెట్ యార్డ్‌లో మీరు విక్రయించే పంటలు మరియు సరుకులను ఎంచుకోండి',
    btnCompleteSignup: 'మండి సైన్ అప్‌ పూర్తి చేయండి',
  },
  hi: {
    merchantSignUp: 'व्यापारी साइन अप',
    stepOf4: (current) => `चरण ${current} / 4`,
    heading: 'अपना मंडी आढ़तिया खाता बनाएं',
    subtitle: 'आसान चरण-दर-चरण प्रक्रिया में अपनी थोक मंडी दुकान पंजीकृत करें',
    step1Title: 'व्यक्तिगत विवरण',
    step1Desc: 'अपना पूरा नाम और 10-अंकीय मोबाइल नंबर दर्ज करें',
    step2Title: 'पासवर्ड',
    step2Desc: 'अपने खाते में लॉगिन करने के लिए एक सुरक्षित पासवर्ड बनाएं',
    step3Title: 'दुकान का विवरण',
    step3Desc: 'अपनी दुकान या फर्म का नाम और स्टॉल नंबर दर्ज करें',
    step4Title: 'मंडी विवरण',
    step4Desc: 'अपना राज्य, Mandi मंडी प्रांगण और पूरा पता चुनें',

    fullNameLabel: 'पूरा नाम (मालिक / व्यापारी) *',
    mobileLabel: 'मोबाइल नंबर (10 अंक) *',
    emailLabel: 'ईमेल पता (वैकल्पिक)',
    passwordLabel: 'लॉगिन पासवर्ड बनाएं *',
    confirmPasswordLabel: 'पुष्टि के लिए पासवर्ड पुनः दर्ज करें *',
    shopNameLabel: 'दुकान / फर्म का नाम *',
    shopNumberLabel: 'दुकान / स्टॉल संख्या',
    stateLabel: 'राज्य *',
    marketYardLabel: 'मार्केट यार्ड / मंडी का नाम *',
    shopAddressLabel: 'दुकान / यार्ड का पूरा पता *',

    fullNamePlaceholder: 'जैसे: रमेश कुमार',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'जैसे: ramesh@manditrader.com',
    passwordPlaceholder: 'भविष्य के लॉगिन के लिए पासवर्ड बनाएं',
    confirmPasswordPlaceholder: 'वही पासवर्ड दोबारा दर्ज करें',
    shopNamePlaceholder: 'जैसे: श्री वेंकटेश्वर ट्रेडिंग कं.',
    shopNumberPlaceholder: 'जैसे: स्टॉल #27, गेट 3',
    marketYardPlaceholder: 'जैसे: थोक मंडी प्रांगण',
    shopAddressPlaceholder: 'जैसे: दुकान #1, गेट 2, मंडी प्रांगण',

    btnNext: 'आगे बढ़ें',
    btnBack: 'पीछे जाएं',
    btnGetOtp: 'एक-बार सत्यापन OTP प्राप्त करें',
    alreadyHaveAccount: 'पहले से खाता है?',
    loginLink: 'लॉगिन करें',

    errFullNameRequired: 'कृपया अपना पूरा नाम दर्ज करें',
    errFullNameNoNumbers: 'पूरे नाम में संख्याएं नहीं हो सकतीं',
    errPhoneRequired: 'वैध 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें (6, 7, 8, या 9 से शुरू होना चाहिए)',
    errPasswordMinLength: 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए',
    errPasswordMismatch: 'पासवर्ड मेल नहीं खाते! कृपया दोनों फ़ील्ड में सटीक समान पासवर्ड दर्ज करें।',
    errShopNameRequired: 'कृपया अपनी दुकान या फर्म का नाम दर्ज करें',
    errMarketYardRequired: 'कृपया अपने मार्केट यार्ड या मंडी का नाम दर्ज करें',
    errShopAddressRequired: 'कृपया अपनी दुकान का पता दर्ज करें',

    otpHeading: 'एक-बार सत्यापन OTP',
    otpSubtitle: (phone) => `+91 ${phone} पर भेजा गया 6-अंकीय कोड दर्ज करें`,
    btnVerifyOtp: 'OTP सत्यापित करें और आगे बढ़ें',
    commodityHeading: 'आपके द्वारा व्यापार की जाने वाली फसलों को चुनें',
    commoditySubtitle: 'मंडी प्रांगण में आपके द्वारा बेचे जाने वाले उत्पादों को चुनें',
    btnCompleteSignup: 'मंडी साइन अप पूरा करें',
  },
  kn: {
    merchantSignUp: 'ವರ್ತಕರ ಸೈನ್ ಅಪ್',
    stepOf4: (current) => `ಹಂತ ${current} / 4`,
    heading: 'ನಿಮ್ಮ ಮಂಡಿ ವರ್ತಕರ ಖಾತೆಯನ್ನು ರಚಿಸಿ',
    subtitle: 'ಸುಲಭ ಹಂತ-ಹಂತದ ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿ ನಿಮ್ಮ ಮಂಡಿ ಅಂಗಡಿಯನ್ನು ನೋಂದಾಯಿಸಿ',
    step1Title: 'ವೈಯಕ್ತಿಕ ವಿವರಗಳು',
    step1Desc: 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಮತ್ತು ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ',
    step2Title: 'ಪಾಸ್‌ವರ್ಡ್',
    step2Desc: 'ನಿಮ್ಮ ಖಾತೆಗೆ ಸುರಕ್ಷಿತ ಲಾಗಿನ್ ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಿ',
    step3Title: 'ಅಂಗಡಿ ವಿವರಗಳು',
    step3Desc: 'ನಿಮ್ಮ ಅಂಗಡಿ/ಸಂಸ್ಥೆಯ ಹೆಸರು ಮತ್ತು ಸ್ಟಾಲ್ ಸಂಖ್ಯೆಯನ್ನು ನೀಡಿ',
    step4Title: 'ಮಾರುಕಟ್ಟೆ ವಿವರಗಳು',
    step4Desc: 'ನಿಮ್ಮ ರಾಜ್ಯ, Mandi ಮಾರುಕಟ್ಟೆ ಮತ್ತು ವಿಳಾಸವನ್ನು ಆಯ್ಕೆಮಾಡಿ',

    fullNameLabel: 'ಪೂರ್ಣ ಹೆಸರು (ಮಾಲೀಕರು / ವರ್ತಕರು) *',
    mobileLabel: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (10 ಅಂಕೆಗಳು) *',
    emailLabel: 'ಇಮೇಲ್ ವಿಳಾಸ (ಐಚ್ಛಿಕ)',
    passwordLabel: 'ಲಾಗಿನ್ ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ *',
    confirmPasswordLabel: 'ಖಚಿತಪಡಿಸಲು ಪಾಸ್‌ವರ್ಡ್ ಮರು ನಮೂದಿಸಿ *',
    shopNameLabel: 'ಅಂಗಡಿ / ಸಂಸ್ಥೆಯ ಹೆಸರು *',
    shopNumberLabel: 'ಅಂಗಡಿ / ಸ್ಟಾಲ್ ಸಂಖ್ಯೆ',
    stateLabel: 'ರಾಜ್ಯ *',
    marketYardLabel: 'ಮಾರುಕಟ್ಟೆ ಯಾರ್ಡ್ / ಮಂಡಿ ಹೆಸರು *',
    shopAddressLabel: 'ಅಂಗಡಿ / ಯಾರ್ಡ್ ಪೂರ್ಣ ವಿಳಾಸ *',

    fullNamePlaceholder: 'ಉದಾ: ರಮೇಶ್ ಕುಮಾರ್',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'ಉದಾ: ramesh@manditrader.com',
    passwordPlaceholder: 'ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಿ',
    confirmPasswordPlaceholder: 'ಅದೇ ಪಾಸ್‌ವರ್ಡ್ ಮರು ನಮೂದಿಸಿ',
    shopNamePlaceholder: 'ಉದಾ: ಶ್ರೀ ವೆಂಕಟೇಶ್ವರ ಟ್ರೇಡಿಂಗ್',
    shopNumberPlaceholder: 'ಉದಾ: ಸ್ಟಾಲ್ #27, ಗೇಟ್ 3',
    marketYardPlaceholder: 'ಉದಾ: ಸಗಟು ಮಾರುಕಟ್ಟೆ ಯಾರ್ಡ್',
    shopAddressPlaceholder: 'ಉದಾ: ಅಂಗಡಿ #1, ಗೇಟ್ 2, ಮಾರ್ಕೆಟ್ ಯಾರ್ಡ್',

    btnNext: 'ಮುಂದೆ',
    btnBack: 'ಹಿಂದೆ',
    btnGetOtp: 'ಒಂದು-ಬಾರಿಯ ಪರಿಶೀಲನೆ OTP ಪಡೆಯಿರಿ',
    alreadyHaveAccount: 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?',
    loginLink: 'ಲಾಗಿನ್ ಮಾಡಿ',

    errFullNameRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
    errFullNameNoNumbers: 'ಹೆಸರಿನಲ್ಲಿ ಸಂಖ್ಯೆಗಳು ಇರಬಾರದು',
    errPhoneRequired: 'ಮಾನ್ಯವಾದ 10-ಅಂಕಿಯ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ (6, 7, 8, ಅಥವಾ 9 ರಿಂದ ಪ್ರಾರಂಭವಾಗಬೇಕು)',
    errPasswordMinLength: 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 4 ಅಕ್ಷರಗಳಿರಬೇಕು',
    errPasswordMismatch: 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ತಾಳೆಯಾಗುತ್ತಿಲ್ಲ!',
    errShopNameRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಅಂಗಡಿಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
    errMarketYardRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮಂಡಿ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
    errShopAddressRequired: 'ದಯವಿಟ್ಟು ಅಂಗಡಿ ವಿಳಾಸ ನಮೂದಿಸಿ',

    otpHeading: 'ಒಂದು-ಬಾರಿಯ ಪರಿಶೀಲನೆ OTP',
    otpSubtitle: (phone) => `+91 ${phone} ಗೆ ಕಳುಹಿಸಲಾದ 6-ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ`,
    btnVerifyOtp: 'OTP ಪರಿಶೀಲಿಸಿ & ಮುಂದುವರಿಯಿರಿ',
    commodityHeading: 'ನೀವು ವ್ಯಾಪಾರ ಮಾಡುವ ಬೆಳೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    commoditySubtitle: 'ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ನೀವು ಮಾರಾಟ ಮಾಡುವ ಉತ್ಪನ್ನಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    btnCompleteSignup: 'ಮಂಡಿ ಸೈನ್ ಅಪ್ ಪೂರ್ಣಗೊಳಿಸಿ',
  },
  ta: {
    merchantSignUp: 'வியாபாரி பதிவு',
    stepOf4: (current) => `படி ${current} / 4`,
    heading: 'உங்கள் மண்டி வியாபாரி கணக்கை உருவாக்கவும்',
    subtitle: 'எளிய படிப்படியான முறையில் உங்கள் மண்டி கடையைப் பதிவு செய்யவும்',
    step1Title: 'தனிப்பட்ட விவரங்கள்',
    step1Desc: 'உங்கள் முழு பெயர் மற்றும் மொபைல் எண்ணை உள்ளிடவும்',
    step2Title: 'கடவுச்சொல்',
    step2Desc: 'உங்கள் கணக்கிற்கு பாதுகாப்பான கடவுச்சொல்லை அமைக்கவும்',
    step3Title: 'கடை விவரங்கள்',
    step3Desc: 'உங்கள் கடை/நிறுவன பெயர் மற்றும் கடை எண்ணை வழங்கவும்',
    step4Title: 'சந்தை விவரங்கள்',
    step4Desc: 'உங்கள் மாநிலம், Mandi சந்தை மற்றும் முகவரியைத் தேர்ந்தெடுக்கவும்',

    fullNameLabel: 'முழு பெயர் (உரிமையாளர் / வியாபாரி) *',
    mobileLabel: 'மொபைல் எண் (10 இலக்கங்கள்) *',
    emailLabel: 'மின்னஞ்சல் முகவரி (விருப்பத்தேர்வு)',
    passwordLabel: 'கடவுச்சொல்லை உருவாக்கவும் *',
    confirmPasswordLabel: 'உறுதிப்படுத்த கடவுச்சொல்லை மீண்டும் உள்ளிடவும் *',
    shopNameLabel: 'கடை / நிறுவன பெயர் *',
    shopNumberLabel: 'கடை / ஸ்டால் எண்',
    stateLabel: 'மாநிலம் *',
    marketYardLabel: 'சந்தை கூடம் / மண்டி பெயர் *',
    shopAddressLabel: 'கடை / கூடத்தின் முழு முகவரி *',

    fullNamePlaceholder: 'எ.கா: ரமேஷ் குமார்',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'எ.கா: ramesh@manditrader.com',
    passwordPlaceholder: 'கடவுச்சொல்லை அமைக்கவும்',
    confirmPasswordPlaceholder: 'அதே கடவுச்சொல்லை மீண்டும் உள்ளிடவும்',
    shopNamePlaceholder: 'எ.கா: ஸ்ரீ வெங்கடேஸ்வரா டிரேடிங்',
    shopNumberPlaceholder: 'எ.கா: ஸ்டால் #27, கேட் 3',
    marketYardPlaceholder: 'எ.கா: மொத்த விற்பனை சந்தை',
    shopAddressPlaceholder: 'எ.கா: கடை #1, கேட் 2, சந்தை',

    btnNext: 'அடுத்து',
    btnBack: 'பின்னால்',
    btnGetOtp: 'ஒரு முறை சரிபார்ப்பு OTP பெறவும்',
    alreadyHaveAccount: 'ஏற்கனவே கணக்கு உள்ளதா?',
    loginLink: 'உள்நுழையவும்',

    errFullNameRequired: 'தயவுசெய்து உங்கள் முழு பெயரை உள்ளிடவும்',
    errFullNameNoNumbers: 'பெயரில் எண்கள் இருக்கக்கூடாது',
    errPhoneRequired: 'செல்லுபடியாகும் 10 இலக்க இந்திய மொபைல் எண்ணை உள்ளிடவும் (6, 7, 8, அல்லது 9 இல் தொடங்க வேண்டும்)',
    errPasswordMinLength: 'கடவுச்சொல் குறைந்தது 4 எழுத்துக்கள் இருக்க வேண்டும்',
    errPasswordMismatch: 'கடவுச்சொற்கள் பொருந்தவில்லை!',
    errShopNameRequired: 'தயவுசெய்து உங்கள் கடை பெயரை உள்ளிடவும்',
    errMarketYardRequired: 'தயவுசெய்து சந்தை பெயரை உள்ளிடவும்',
    errShopAddressRequired: 'தயவுசெய்து கடை முகவரியை உள்ளிடவும்',

    otpHeading: 'ஒரு முறை சரிபார்ப்பு OTP',
    otpSubtitle: (phone) => `+91 ${phone} க்கு அனுப்பப்பட்ட 6 இலக்க குறியீட்டை உள்ளிடவும்`,
    btnVerifyOtp: 'OTP சரிபார்த்து தொடரவும்',
    commodityHeading: 'நீங்கள் வர்த்தகம் செய்யும் பயிர்களைத் தேர்ந்தெடுக்கவும்',
    commoditySubtitle: 'சந்தையில் நீங்கள் கையாளும பொருட்களைத் தேர்ந்தெடுக்கவும்',
    btnCompleteSignup: 'மண்டி பதிவை முடிக்கவும்',
  },
  mr: {
    merchantSignUp: 'व्यापारी नोंदणी',
    stepOf4: (current) => `टप्पा ${current} / 4`,
    heading: 'तुमचे मंडी व्यापारी खाते तयार करा',
    subtitle: 'सोप्या टप्प्याटप्प्याने तुमचे मंडी दुकान नोंदणीकृत करा',
    step1Title: 'वैयक्तिक तपशील',
    step1Desc: 'तुमचे पूर्ण नाव आणि मोबाईल नंबर प्रविष्ट करा',
    step2Title: 'पासवर्ड',
    step2Desc: 'तुमच्या खात्यासाठी सुरक्षित पासवर्ड सेट करा',
    step3Title: 'दुकानाचा तपशील',
    step3Desc: 'तुमच्या दुकानाचे/फर्मचे नाव आणि गाळा क्रमांक प्रविष्ट करा',
    step4Title: 'बाजार समिती तपशील',
    step4Desc: 'तुमचे राज्य, Mandi बाजार समिती आणि पत्ता निवडा',

    fullNameLabel: 'पूर्ण नाव (मालक / व्यापारी) *',
    mobileLabel: 'मोबाईल नंबर (10 अंक) *',
    emailLabel: 'ईमेल पत्ता (ऐच्छिक)',
    passwordLabel: 'लॉगिन पासवर्ड तयार करा *',
    confirmPasswordLabel: 'खात्री करण्यासाठी पासवर्ड पुन्हा टाका *',
    shopNameLabel: 'दुकानाचा / फर्मचे नाव *',
    shopNumberLabel: 'दुकान / गाळा क्रमांक',
    stateLabel: 'राज्य *',
    marketYardLabel: 'बाजार समिती / मंडीचे नाव *',
    shopAddressLabel: 'दुकानाचा / यार्डचा पूर्ण पत्ता *',

    fullNamePlaceholder: 'उदा: रमेश कुमार',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'उदा: ramesh@manditrader.com',
    passwordPlaceholder: 'पासवर्ड सेट करा',
    confirmPasswordPlaceholder: 'तोच पासवर्ड पुन्हा टाका',
    shopNamePlaceholder: 'उदा: श्री व्यंकटेश ट्रेडिंग कं.',
    shopNumberPlaceholder: 'उदा: गाळा #27, गेट 3',
    marketYardPlaceholder: 'उदा: घाऊक बाजार समिती',
    shopAddressPlaceholder: 'उदा: दुकान #1, गेट 2, मार्केट यार्ड',

    btnNext: 'पुढे जा',
    btnBack: 'मागे जा',
    btnGetOtp: 'वन-टाईम पडताळणी OTP मिळवा',
    alreadyHaveAccount: 'आधीच खाते आहे का?',
    loginLink: 'लॉगिन करा',

    errFullNameRequired: 'कृपया तुमचे पूर्ण नाव टाका',
    errFullNameNoNumbers: 'नावात अंक असणार नाहीत',
    errPhoneRequired: 'वैध 10-अंकी भारतीय मोबाईल नंबर टाका (6, 7, 8, किंवा 9 ने सुरू होणारा)',
    errPasswordMinLength: 'पासवर्ड किमान 4 अक्षरांचा असावा',
    errPasswordMismatch: 'पासवर्ड जुळत नाहीत!',
    errShopNameRequired: 'कृपया तुमच्या दुकानाचे नाव टाका',
    errMarketYardRequired: 'कृपया बाजार समितीचे नाव टाका',
    errShopAddressRequired: 'कृपया दुकानाचा पत्ता टाका',

    otpHeading: 'वन-टाईम पडताळणी OTP',
    otpSubtitle: (phone) => `+91 ${phone} वर पाठवलेला 6-अंकी कोड टाका`,
    btnVerifyOtp: 'OTP पडताळा आणि पुढे जा',
    commodityHeading: 'तुम्ही व्यापार करत असलेला माल निवडा',
    commoditySubtitle: 'बाजार समितीत तुम्ही खरेदी-विक्री करणारी पिके निवडा',
    btnCompleteSignup: 'मंडी नोंदणी पूर्ण करा',
  },
  gu: {
    merchantSignUp: 'વેપારી સાઇન અપ',
    stepOf4: (current) => `પગલું ${current} / 4`,
    heading: 'તમારું મંડી વેપારી ખાતું બનાવો',
    subtitle: 'સરળ પગલાં દ્વારા તમારી મંડી દુકાનની નોંધણી કરો',
    step1Title: 'અંગત વિગતો',
    step1Desc: 'તમારું પૂરૂં નામ અને મોબાઇલ નંબર લખો',
    step2Title: 'પાસવર્ડ',
    step2Desc: 'તમારા ખાતા માટે સુરક્ષિત પાસવર્ડ સેટ કરો',
    step3Title: 'દુકાનની વિગતો',
    step3Desc: 'તમારી દુકાન/ફર્મનું નામ અને સ્ટોલ નંબર આપો',
    step4Title: 'માર્કેટ વિગતો',
    step4Desc: 'તમારું રાજ્ય, Mandi માર્કેટ યાર્ડ અને સરનામું પસંદ કરો',

    fullNameLabel: 'પૂરું નામ (માલિક / વેપારી) *',
    mobileLabel: 'મોબાઇલ નંબર (10 અંક) *',
    emailLabel: 'ઇમેઇલ સરનામું (વૈકલ્પિક)',
    passwordLabel: 'લોગિન પાસવર્ડ બનાવો *',
    confirmPasswordLabel: 'પાસવર્ડ ફરીથી દાખલ કરો *',
    shopNameLabel: 'દુકાન / ફર્મનું નામ *',
    shopNumberLabel: 'દુકાન / સ્ટોલ નંબર',
    stateLabel: 'રાજ્ય *',
    marketYardLabel: 'માર્કેટ યાર્ડ / મંડીનું નામ *',
    shopAddressLabel: 'દુકાન / યાર્ડનું પૂરું સરનામું *',

    fullNamePlaceholder: 'દા.ત. રમેશ કુમાર',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'દા.ત. ramesh@manditrader.com',
    passwordPlaceholder: 'પાસવર્ડ સેટ કરો',
    confirmPasswordPlaceholder: 'એ જ પાસવર્ડ ફરીથી લખો',
    shopNamePlaceholder: 'દા.ત. શ્રી વેંકટેશ્વરા ટ્રેડિંગ કો.',
    shopNumberPlaceholder: 'દા.ત. સ્ટોલ #27, ગેટ 3',
    marketYardPlaceholder: 'દા.ત. હોલસેલ માર્કેટ યાર્ડ',
    shopAddressPlaceholder: 'દા.ત. દુકાન #1, ગેટ 2, માર્કેટ યાર્ડ',

    btnNext: 'આગળ વધો',
    btnBack: 'પાછા જાઓ',
    btnGetOtp: 'વન-ટાઇમ ચકાસણી OTP મેળવો',
    alreadyHaveAccount: 'પહેલેથી ખાતું છે?',
    loginLink: 'લોગિન કરો',

    errFullNameRequired: 'કૃપા કરીને તમારું પૂરું નામ લખો',
    errFullNameNoNumbers: 'નામમાં આંકડા હોઈ શકે નહીં',
    errPhoneRequired: 'માન્ય 10-અંકનો ભારતીય મોબાઇલ નંબર લખો (6, 7, 8, અથવા 9 થી શરૂ થવો જોઈએ)',
    errPasswordMinLength: 'પાસવર્ડ ઓછામાં ઓછો 4 અક્ષરોનો હોવો જોઈએ',
    errPasswordMismatch: 'પાસવર્ડ મેચ થતા નથી!',
    errShopNameRequired: 'કૃપા કરીને તમારી દુકાનનું નામ લખો',
    errMarketYardRequired: 'કૃપા કરીને માર્કેટ યાર્ડનું નામ લખો',
    errShopAddressRequired: 'કૃપા કરીને દુકાનનું સરનામું લખો',

    otpHeading: 'વન-ટાઇમ ચકાસણી OTP',
    otpSubtitle: (phone) => `+91 ${phone} પર મોકલેલ 6-અંકનો કોડ લખો`,
    btnVerifyOtp: 'OTP ચકાસો અને આગળ વધો',
    commodityHeading: 'તમે જે પાકનો વેપાર કરો છો તે પસંદ કરો',
    commoditySubtitle: 'માર્કેટ યાર્ડમાં તમે વેચતા પાકો પસંદ કરો',
    btnCompleteSignup: 'મંડી સાઇન અપ પૂર્ણ કરો',
  },
  bn: {
    merchantSignUp: 'বণিক সাইন আপ',
    stepOf4: (current) => `ধাপ ${current} / 4`,
    heading: 'আপনার মান্ডি ব্যবসায়ী অ্যাকাউন্ট তৈরি করুন',
    subtitle: 'সহজ ধাপে ধাপে আপনার পাইকারি মান্ডি দোকান নিবন্ধন করুন',
    step1Title: 'ব্যক্তিগত বিবরণ',
    step1Desc: 'আপনার পুরো নাম এবং মোবাইল নম্বর লিখুন',
    step2Title: 'পাসওয়ার্ড',
    step2Desc: 'আপনার অ্যাকাউন্টের জন্য একটি সুরক্ষিত পাসওয়ার্ড সেট করুন',
    step3Title: 'দোকানের বিবরণ',
    step3Desc: 'আপনার দোকান/ফার্মের নাম এবং স্টল নম্বর দিন',
    step4Title: 'বাজারের বিবরণ',
    step4Desc: 'আপনার রাজ্য, Mandi বাজার ইয়ার্ড এবং ঠিকানা নির্বাচন করুন',

    fullNameLabel: 'পুরো নাম (মালিক / ব্যবসায়ী) *',
    mobileLabel: 'মোবাইল নম্বর (১০ ডিজিট) *',
    emailLabel: 'ইমেল ঠিকানা (ঐচ্ছিক)',
    passwordLabel: 'লগইন পাসওয়ার্ড তৈরি করুন *',
    confirmPasswordLabel: 'পাসওয়ার্ড নিশ্চিত করতে পুনরায় লিখুন *',
    shopNameLabel: 'দোকান / ফার্মের নাম *',
    shopNumberLabel: 'দোকান / স্টল নম্বর',
    stateLabel: 'রাজ্য *',
    marketYardLabel: 'মার্কেট ইয়ার্ড / মান্ডির নাম *',
    shopAddressLabel: 'দোকান / ইয়ার্ডের সম্পূর্ণ ঠিকানা *',

    fullNamePlaceholder: 'যেমন: রমেশ কুমার',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'যেমন: ramesh@manditrader.com',
    passwordPlaceholder: 'পাসওয়ার্ড সেট করুন',
    confirmPasswordPlaceholder: 'একই পাসওয়ার্ড পুনরায় লিখুন',
    shopNamePlaceholder: 'যেমন: শ্রী ভেঙ্কটেশ্বর ট্রেডিং কোং',
    shopNumberPlaceholder: 'যেমন: স্টল #২৭, গেট ৩',
    marketYardPlaceholder: 'যেমন: পাইকারি মার্কেট ইয়ার্ড',
    shopAddressPlaceholder: 'যেমন: দোকান #১, গেট ২, মার্কেট ইয়ার্ড',

    btnNext: 'পরবর্তী',
    btnBack: 'পিছনে',
    btnGetOtp: 'ওয়ান-টাইম ভেরিফিকেশন OTP পান',
    alreadyHaveAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
    loginLink: 'লগইন করুন',

    errFullNameRequired: 'দয়া করে আপনার পুরো নাম লিখুন',
    errFullNameNoNumbers: 'নামে কোনো সংখ্যা থাকতে পারবে না',
    errPhoneRequired: 'সঠিক ১০ সংখ্যার ভারতীয় মোবাইল নম্বর লিখুন (৬, ৭, ৮, বা ৯ দিয়ে শুরু হতে হবে)',
    errPasswordMinLength: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে',
    errPasswordMismatch: 'পাসওয়ার্ড মিলছে না!',
    errShopNameRequired: 'দয়া করে আপনার দোকানের নাম লিখুন',
    errMarketYardRequired: 'দয়া করে বাজারের নাম লিখুন',
    errShopAddressRequired: 'দয়া করে দোকানের ঠিকানা লিখুন',

    otpHeading: 'ওয়ান-টাইম ভেরিফিকেশন OTP',
    otpSubtitle: (phone) => `+91 ${phone} এ পাঠানো ৬ সংখ্যার কোড লিখুন`,
    btnVerifyOtp: 'OTP যাচাই করুন এবং এগিয়ে যান',
    commodityHeading: 'আপনার ব্যবসার পণ্যসমূহ নির্বাচন করুন',
    commoditySubtitle: 'বাজারে আপনি যে ফসল বেচাকেনা করেন তা বাছুন',
    btnCompleteSignup: 'মান্ডি সাইন আপ সম্পন্ন করুন',
  },
  pa: {
    merchantSignUp: 'ਵਪਾਰੀ ਸਾਈਨ ਅੱਪ',
    stepOf4: (current) => `ਕਦਮ ${current} / 4`,
    heading: 'ਆਪਣਾ ਮੰਡੀ ਵਪਾਰੀ ਖਾਤਾ ਬਣਾਓ',
    subtitle: 'ਆਪਣੀ ਮੰਡੀ ਦੀ ਦੁਕਾਨ ਰਜਿਸਟਰ ਕਰੋ',
    step1Title: 'ਨਿੱਜੀ ਵੇਰਵੇ',
    step1Desc: 'ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਅਤੇ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ',
    step2Title: 'ਪਾਸਵਰਡ',
    step2Desc: 'ਲਾਗਇਨ ਪਾਸਵਰਡ ਸੈੱਟ ਕਰੋ',
    step3Title: 'ਦੁਕਾਨ ਦੇ ਵੇਰਵੇ',
    step3Desc: 'ਆਪਣੀ ਦੁਕਾਨ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ',
    step4Title: 'ਮੰਡੀ ਦੇ ਵੇਰਵੇ',
    step4Desc: 'ਆਪਣੀ ਮੰਡੀ ਅਤੇ ਪਤਾ ਚੁਣੋ',

    fullNameLabel: 'ਪੂਰਾ ਨਾਮ (ਮਾਲਕ / ਵਪਾਰੀ) *',
    mobileLabel: 'ਮੋਬਾਈਲ ਨੰਬਰ (10 ਅੰਕ) *',
    emailLabel: 'ਈਮੇਲ ਪਤਾ (ਵਿਕਲਪਿਕ)',
    passwordLabel: 'ਲਾਗਇਨ ਪਾਸਵਰਡ ਬਣਾਓ *',
    confirmPasswordLabel: 'ਪਾਸਵਰਡ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ *',
    shopNameLabel: 'ਦੁਕਾਨ / ਫਰਮ ਦਾ ਨਾਮ *',
    shopNumberLabel: 'ਦੁਕਾਨ / ਸਟਾਲ ਨੰਬਰ',
    stateLabel: 'ਰਾਜ *',
    marketYardLabel: 'ਮਾਰਕੀਟ ਯਾਰਡ / ਮੰਡੀ ਦਾ ਨਾਮ *',
    shopAddressLabel: 'ਦੁਕਾਨ ਦਾ ਪੂਰਾ ਪਤਾ *',

    fullNamePlaceholder: 'ਜਿਵੇਂ: ਰਮੇਸ਼ ਕੁਮਾਰ',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'ਜਿਵੇਂ: ramesh@manditrader.com',
    passwordPlaceholder: 'ਪਾਸਵਰਡ ਸੈੱਟ ਕਰੋ',
    confirmPasswordPlaceholder: 'ਉਹੀ ਪਾਸਵਰਡ ਦੁਬਾਰਾ ਦਰਜ ਕਰੋ',
    shopNamePlaceholder: 'ਜਿਵੇਂ: ਸ਼੍ਰੀ ਵੈਂਕਟੇਸ਼ਵਰਾ ਟ੍ਰੇਡਿੰਗ',
    shopNumberPlaceholder: 'ਜਿਵੇਂ: ਸਟਾਲ #27, ਗੇਟ 3',
    marketYardPlaceholder: 'ਜਿਵੇਂ: ਥੋਕ ਮੰਡੀ',
    shopAddressPlaceholder: 'ਜਿਵੇਂ: ਦੁਕਾਨ #1, ਮੰਡੀ ਯਾਰਡ',

    btnNext: 'ਅੱਗੇ',
    btnBack: 'ਪਿੱਛੇ',
    btnGetOtp: 'ਇੱਕ-ਵਾਰੀ ਜਾਂਚ OTP ਪ੍ਰਾਪਤ ਕਰੋ',
    alreadyHaveAccount: 'ਪਹਿਲਾਂ ਤੋਂ ਖਾਤਾ ਹੈ?',
    loginLink: 'ਲਾਗਇਨ ਕਰੋ',

    errFullNameRequired: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਦਰਜ ਕਰੋ',
    errFullNameNoNumbers: 'ਨਾਮ ਵਿੱਚ ਅੰਕ ਨਹੀਂ ਹੋ ਸਕਦੇ',
    errPhoneRequired: 'ਮਾਨਤਾ ਪ੍ਰਾਪਤ 10-ਅੰਕਾਂ ਦਾ ਭਾਰਤੀ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ (6, 7, 8, ਜਾਂ 9 ਤੋਂ ਸ਼ੁਰੂ)',
    errPasswordMinLength: 'ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 4 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ',
    errPasswordMismatch: 'ਪਾਸਵਰਡ ਮੇਲ ਨਹੀਂ ਖਾਂਦੇ!',
    errShopNameRequired: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਦੁਕਾਨ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ',
    errMarketYardRequired: 'ਕਿਰਪਾ ਕਰਕੇ ਮੰਡੀ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ',
    errShopAddressRequired: 'ਕਿਰਪਾ ਕਰਕੇ ਦੁਕਾਨ ਦਾ ਪਤਾ ਦਰਜ ਕਰੋ',

    otpHeading: 'ਇੱਕ-ਵਾਰੀ ਜਾਂਚ OTP',
    otpSubtitle: (phone) => `+91 ${phone} 'ਤੇ ਭੇਜਿਆ 6-ਅੰਕੀ ਕੋਡ ਦਰਜ ਕਰੋ`,
    btnVerifyOtp: 'OTP ਦੀ ਜਾਂਚ ਕਰੋ & ਅੱਗੇ ਵਧੋ',
    commodityHeading: 'ਵਪਾਰ ਦੀਆਂ ਫਸਲਾਂ ਚੁਣੋ',
    commoditySubtitle: 'ਮੰਡੀ ਵਿੱਚ ਵੇਚੀਆਂ ਜਾਣ ਵਾਲੀਆਂ ਫਸਲਾਂ ਚੁਣੋ',
    btnCompleteSignup: 'ਮੰਡੀ ਸਾਈਨ ਅੱਪ ਪੂਰਾ ਕਰੋ',
  },
  ml: {
    merchantSignUp: 'വ്യാപാരി സൈൻ അപ്പ്',
    stepOf4: (current) => `ഘട്ടം ${current} / 4`,
    heading: 'മണ്ടി വ്യാപാരി അക്കൗണ്ട് ഉണ്ടാക്കുക',
    subtitle: 'നിങ്ങളുടെ മണ്ടി കട രജിസ്റ്റർ ചെയ്യുക',
    step1Title: 'വ്യക്തിഗത വിവരങ്ങൾ',
    step1Desc: 'പേരും മൊബൈൽ നമ്പറും നൽകുക',
    step2Title: 'പാസ്‌വേഡ്',
    step2Desc: 'ലോഗിൻ പാസ്‌വേഡ് സെറ്റ് ചെയ്യുക',
    step3Title: 'കടയുടെ വിവരങ്ങൾ',
    step3Desc: 'കടയുടെ പേര് നൽകുക',
    step4Title: 'മാർക്കറ്റ് വിവരങ്ങൾ',
    step4Desc: 'മണ്ടിയും വിലാസവും തിരഞ്ഞെടുക്കുക',

    fullNameLabel: 'പൂർണ്ണ പേര് (ഉടമ / വ്യാപാരി) *',
    mobileLabel: 'മൊബൈൽ നമ്പർ (10 അക്കങ്ങൾ) *',
    emailLabel: 'ഇമെയിൽ വിലാസം (ഓപ്ഷണൽ)',
    passwordLabel: 'ലോഗിൻ പാസ്‌വേഡ് ഉണ്ടാക്കുക *',
    confirmPasswordLabel: 'പാസ്‌വേഡ് ഉറപ്പാക്കുക *',
    shopNameLabel: 'കട / സ്ഥാപനത്തിന്റെ പേര് *',
    shopNumberLabel: 'കട / സ്റ്റാൾ നമ്പർ',
    stateLabel: 'സംസ്ഥാനം *',
    marketYardLabel: 'മാർക്കറ്റ് യാർഡ് / മണ്ടിയുടെ പേര് *',
    shopAddressLabel: 'കടയുടെ പൂർണ്ണ വിലാസം *',

    fullNamePlaceholder: 'ഉദാ: രമേഷ് കുമാർ',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'ഉദാ: ramesh@manditrader.com',
    passwordPlaceholder: 'പാസ്‌വേഡ് നൽകുക',
    confirmPasswordPlaceholder: 'അതേ പാസ്‌വേഡ് വീണ്ടും നൽകുക',
    shopNamePlaceholder: 'ഉദാ: ശ്രീ വെങ്കടേശ്വര ട്രേഡിംഗ്',
    shopNumberPlaceholder: 'ഉദാ: സ്റ്റാൾ #27, ഗേറ്റ് 3',
    marketYardPlaceholder: 'ഉദാ: ഹോൾസെയിൽ മാർക്കറ്റ് യാർഡ്',
    shopAddressPlaceholder: 'ഉദാ: കട #1, മാർക്കറ്റ് യാർഡ്',

    btnNext: 'അടുത്തത്',
    btnBack: 'പിന്നോട്ട്',
    btnGetOtp: 'ഒറ്റത്തവണ പരിശോധന OTP നേടുക',
    alreadyHaveAccount: 'അക്കൗണ്ട് ഉണ്ടോ?',
    loginLink: 'ലോഗിൻ ചെയ്യുക',

    errFullNameRequired: 'ദയവായി നിങ്ങളുടെ പൂർണ്ണ പേര് നൽകുക',
    errFullNameNoNumbers: 'പേരിൽ അക്കങ്ങൾ പാടില്ല',
    errPhoneRequired: 'സാധുവായ 10 അക്ക ഇന്ത്യൻ മൊബൈൽ നമ്പർ നൽകുക (6, 7, 8, അല്ലെങ്കിൽ 9 ൽ ആരംഭിക്കണം)',
    errPasswordMinLength: 'പാസ്‌വേഡ് കുറഞ്ഞത് 4 അക്ഷരങ്ങൾ വേണം',
    errPasswordMismatch: 'പാസ്‌വേഡുകൾ ചേരുന്നില്ല!',
    errShopNameRequired: 'ദയവായി കടയുടെ പേര് നൽകുക',
    errMarketYardRequired: 'ദയവായി മണ്ടിയുടെ പേര് നൽകുക',
    errShopAddressRequired: 'ദയവായി വിലാസം നൽകുക',

    otpHeading: 'ഒറ്റത്തവണ പരിശോധന OTP',
    otpSubtitle: (phone) => `+91 ${phone} ലേക്ക് അയച്ച 6 അക്ക കോഡ് നൽകുക`,
    btnVerifyOtp: 'OTP പരിശോധിച്ച് തുടരുക',
    commodityHeading: 'വ്യാപാരം ചെയ്യുന്ന ഉൽപ്പന്നങ്ങൾ തിരഞ്ഞെടുക്കുക',
    commoditySubtitle: 'മാർക്കറ്റിൽ കൈകാര്യം ചെയ്യുന്ന വിളകൾ തിരഞ്ഞെടുക്കുക',
    btnCompleteSignup: 'മണ്ടി സൈൻ അപ്പ് പൂർത്തിയാക്കുക',
  },
  or: {
    merchantSignUp: 'ବ୍ୟବସାୟୀ ସାଇନ୍ ଅପ୍',
    stepOf4: (current) => `ପଦକ୍ଷେପ ${current} / 4`,
    heading: 'ଆପଣଙ୍କ ମଣ୍ଡି ବ୍ୟବସାୟୀ ଆକାଉଣ୍ଟ୍ ସୃଷ୍ଟି କରନ୍ତୁ',
    subtitle: 'ଆପଣଙ୍କ ମଣ୍ଡି ଦୋକାନ ପଞ୍ଜିକରଣ କରନ୍ତୁ',
    step1Title: 'ବ୍ୟକ୍ତିଗତ ବିବରଣୀ',
    step1Desc: 'ପୂରା ନାମ ଓ ମୋବାଇଲ୍ ନମ୍ବର ଦିଅନ୍ତୁ',
    step2Title: 'ପାସୱାର୍ଡ',
    step2Desc: 'ଲଗଇନ୍ ପାସୱାର୍ଡ ସେଟ୍ କରନ୍ତୁ',
    step3Title: 'ଦୋକାନ ବିବରଣୀ',
    step3Desc: 'ଦୋକାନର ନାମ ଦିଅନ୍ତୁ',
    step4Title: 'ମାର୍କେଟ ବିବରଣୀ',
    step4Desc: 'ମଣ୍ଡି ଓ ଠିକଣା ବାଛନ୍ତୁ',

    fullNameLabel: 'ପୂରା ନାମ (ମାଲିକ / ବ୍ୟବସାୟୀ) *',
    mobileLabel: 'ମୋବାଇଲ୍ ନମ୍ବର (10 ଅଙ୍କ) *',
    emailLabel: 'ଇମେଲ୍ ଠିକଣା (ବିକଳ୍ପ)',
    passwordLabel: 'ଲଗଇନ୍ ପାସୱାର୍ଡ ତିଆରି କରନ୍ତୁ *',
    confirmPasswordLabel: 'ପାସୱାର୍ଡ ନିଶ୍ଚିତ କରନ୍ତୁ *',
    shopNameLabel: 'ଦୋକାନ / ଫାର୍ମର ନାମ *',
    shopNumberLabel: 'ଦୋକାନ / ଷ୍ଟଲ୍ ନମ୍ବର',
    stateLabel: 'ରାଜ୍ୟ *',
    marketYardLabel: 'ମାର୍କେଟ ୟାର୍ଡ / ମଣ୍ଡି ନାମ *',
    shopAddressLabel: 'ଦୋକାନର ସମ୍ପୂର୍ଣ୍ଣ ଠିକଣା *',

    fullNamePlaceholder: 'ଯଥା: ରମେଶ କୁମାର',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'ଯଥା: ramesh@manditrader.com',
    passwordPlaceholder: 'ପାସୱାର୍ଡ ଦିଅନ୍ତୁ',
    confirmPasswordPlaceholder: 'ସେହି ପାସୱାର୍ଡ ପୁଣି ଲେଖନ୍ତୁ',
    shopNamePlaceholder: 'ଯଥା: ଶ୍ରୀ ଭେଙ୍କଟେଶ୍ୱର ଟ୍ରେଡିଂ',
    shopNumberPlaceholder: 'ଯଥା: ଷ୍ଟଲ୍ #27, ଗେଟ୍ 3',
    marketYardPlaceholder: 'ଯଥା: ହୋଲସେଲ ମାର୍କେଟ ୟାର୍ଡ',
    shopAddressPlaceholder: 'ଯଥା: ଦୋକାନ #1, ମାର୍କେଟ ୟାର୍ଡ',

    btnNext: 'ପରବର୍ତ୍ତୀ',
    btnBack: 'ପଛକୁ',
    btnGetOtp: 'ୱାନ-ଟାଇମ୍ ଯାଞ୍ଚ OTP ପାଆନ୍ତୁ',
    alreadyHaveAccount: 'ପୂର୍ବରୁ ଆକାଉଣ୍ଟ୍ ଅଛି?',
    loginLink: 'ଲଗଇନ୍ କରନ୍ତୁ',

    errFullNameRequired: 'ଦୟାକରି ଆପଣଙ୍କ ପୂରା ନାମ ଲେଖନ୍ତୁ',
    errFullNameNoNumbers: 'ନାମରେ କୌଣସି ଅଙ୍କ ରହିପାରିବ ନାହିଁ',
    errPhoneRequired: 'ବୈଧ 10-ଅଙ୍କ ବିଶିଷ୍ଟ ଭାରତୀୟ ମୋବାଇଲ୍ ନମ୍ବର ଦିଅନ୍ତୁ (6, 7, 8, କିମ୍ବା 9 ରୁ ଆରମ୍ଭ)',
    errPasswordMinLength: 'ପାସୱାର୍ଡ ଅତି କମରେ 4 ଅକ୍ଷର ହେବା ଆବଶ୍ୟକ',
    errPasswordMismatch: 'ପାସୱାର୍ଡ ମେଳ ଖାଉନାହିଁ!',
    errShopNameRequired: 'ଦୟାକରି ଦୋକାନର ନାମ ଦିଅନ୍ତୁ',
    errMarketYardRequired: 'ଦୟାକରି ମଣ୍ଡିର ନାମ ଦିଅନ୍ତୁ',
    errShopAddressRequired: 'ଦୟାକରି ଠିକଣା ଦିଅନ୍ତୁ',

    otpHeading: 'ୱାନ-ଟାଇମ୍ ଯାଞ୍ଚ OTP',
    otpSubtitle: (phone) => `+91 ${phone} କୁ ପଠାଯାଇଥିବା 6 ਅଙ୍କର କୋଡ୍ ଦିଅନ୍ତୁ`,
    btnVerifyOtp: 'OTP ଯାଞ୍ଚ କରନ୍ତୁ & ଆଗକୁ ବଢନ୍ତୁ',
    commodityHeading: 'ବ୍ୟବସାୟ କରୁଥିବା ଫସଲ ବାଛନ୍ତୁ',
    commoditySubtitle: 'ମଣ୍ଡିରେ ବିକ୍ରି ହେଉଥିବା ଜିନିଷ ବାଛନ୍ତୁ',
    btnCompleteSignup: 'ମଣ୍ଡି ସାଇନ୍ ଅପ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ',
  },
  as: {
    merchantSignUp: 'ব্যৱসায়ী ছাইন আপ',
    stepOf4: (current) => `পদক্ষেপ ${current} / 4`,
    heading: 'আপোনাৰ মাণ্ডি ব্যৱসায়ী একাউন্ট সৃষ্টি কৰক',
    subtitle: 'আপোনাৰ মাণ্ডি দোকান পঞ্জীয়ন কৰক',
    step1Title: 'ব্যক্তিগত বিৱৰণ',
    step1Desc: 'সম্পূৰ্ণ নাম আৰু মোবাইল নম্বৰ দিয়ক',
    step2Title: 'পাছৱৰ্ড',
    step2Desc: 'লগইন পাছৱৰ্ড ছেট কৰক',
    step3Title: 'দোকানৰ বিৱৰণ',
    step3Desc: 'দোকানৰ নাম দিয়ক',
    step4Title: 'বজাৰৰ বিৱৰণ',
    step4Desc: 'মাণ্ডি আৰু ঠিকানা বাছনি কৰক',

    fullNameLabel: 'সম্পূৰ্ণ নাম (মালিক / ব্যৱসায়ী) *',
    mobileLabel: 'মোবাইল নম্বৰ (১০ টা অংক) *',
    emailLabel: 'ইমেইল ঠিকনা (ঐচ্ছিক)',
    passwordLabel: 'লগইন পাছৱৰ্ড সৃষ্টি কৰক *',
    confirmPasswordLabel: 'পাছৱৰ্ড নিশ্চিত কৰক *',
    shopNameLabel: 'দোকান / ফাৰ্মৰ নাম *',
    shopNumberLabel: 'দোকান / ষ্টল নম্বৰ',
    stateLabel: 'ৰাজ্য *',
    marketYardLabel: 'মাৰ্কেট ইয়াৰ্ড / মাণ্ডিৰ নাম *',
    shopAddressLabel: 'দোকানৰ সম্পূৰ্ণ ঠিকনা *',

    fullNamePlaceholder: 'যেনে: ৰমেশ কুমাৰ',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'যেনে: ramesh@manditrader.com',
    passwordPlaceholder: 'পাছৱৰ্ড দিয়ক',
    confirmPasswordPlaceholder: 'একে পাছৱৰ্ড আকৌ লিখক',
    shopNamePlaceholder: 'যেনে: শ্ৰী ভেঙ্কটেশ্বৰ ট্ৰেডিং',
    shopNumberPlaceholder: 'যেনে: ষ্টল #২৭, গেট ৩',
    marketYardPlaceholder: 'যেনে: পাইকাৰী মাৰ্কেট ইয়াৰ্ড',
    shopAddressPlaceholder: 'যেনে: দোকান #১, মাৰ্কেট ইয়াৰ্ড',

    btnNext: 'পৰৱৰ্তী',
    btnBack: 'পাছলৈ',
    btnGetOtp: 'ৱান-টাইম সত্যাপন OTP পাওক',
    alreadyHaveAccount: 'আগতে একাউন্ট আছে?',
    loginLink: 'লগইন কৰক',

    errFullNameRequired: 'অনুগ্ৰহ কৰি আপোনাৰ সম্পূৰ্ণ নাম লিখক',
    errFullNameNoNumbers: 'নামত কোনো অংক থাকিব নোৱাৰে',
    errPhoneRequired: 'বৈধ ১০ অংকৰ ভাৰতীয় মোবাইল নম্বৰ দিয়ক (৬, ৭, ৮, বা ৯ ৰে আৰম্ভ)',
    errPasswordMinLength: 'পাছৱৰ্ড কমেও ৪ টা আখৰৰ হ’ব লাগিব',
    errPasswordMismatch: 'পাছৱৰ্ড মিলা নাই!',
    errShopNameRequired: 'অনুগ্ৰহ কৰি দোকানৰ নাম দিয়ক',
    errMarketYardRequired: 'অনুগ্ৰহ কৰি মাণ্ডিৰ নাম দিয়ক',
    errShopAddressRequired: 'অনুগ্ৰহ কৰি ঠিকনা দিয়ক',

    otpHeading: 'ৱান-টাইম সত্যাপন OTP',
    otpSubtitle: (phone) => `+91 ${phone} লৈ প্ৰেৰণ কৰা ৬ অংকৰ ক’ড দিয়ক`,
    btnVerifyOtp: 'OTP সত্যাপন কৰক & আগবাঢ়ক',
    commodityHeading: 'ব্যৱসায় কৰা শস্য বাছনি কৰক',
    commoditySubtitle: 'বজাৰত বিক্ৰী কৰা সামগ্ৰী বাছক',
    btnCompleteSignup: 'মাণ্ডি ছাইন আপ সম্পূৰ্ণ কৰক',
  },
  ur: {
    merchantSignUp: 'تاجر سائن اپ',
    stepOf4: (current) => `مرحلہ ${current} / 4`,
    heading: 'اپنا منڈی مرچنٹ اکاؤنٹ بنائیں',
    subtitle: 'اپنی منڈی کی دکان رجسٹر کریں',
    step1Title: 'ذاتی تفصیلات',
    step1Desc: 'اپنا پورا نام اور موبائل نمبر درج کریں',
    step2Title: 'پاس ورڈ',
    step2Desc: 'لاگ ان پاس ورڈ سیٹ کریں',
    step3Title: 'دکان کی تفصیلات',
    step3Desc: 'اپنی دکان کا نام درج کریں',
    step4Title: 'منڈی کی تفصیلات',
    step4Desc: 'اپنی منڈی اور پتہ منتخب کریں',

    fullNameLabel: 'پورا نام (مالک / تاجر) *',
    mobileLabel: 'موبائل نمبر (10 ہندسے) *',
    emailLabel: 'ای میل پتہ (اختیاری)',
    passwordLabel: 'لاگ ان پاس ورڈ بنائیں *',
    confirmPasswordLabel: 'پاس ورڈ کی تصدیق کریں *',
    shopNameLabel: 'دکان / فرم کا نام *',
    shopNumberLabel: 'دکان / اسٹال نمبر',
    stateLabel: 'ریاست *',
    marketYardLabel: 'مارکیٹ یارڈ / منڈی کا نام *',
    shopAddressLabel: 'دکان کا مکمل پتہ *',

    fullNamePlaceholder: 'مثلاً: رمیش کمار',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'مثلاً: ramesh@manditrader.com',
    passwordPlaceholder: 'پاس ورڈ درج کریں',
    confirmPasswordPlaceholder: 'وہی پاس ورڈ دوبارہ درج کریں',
    shopNamePlaceholder: 'مثلاً: شری وینکٹیشور ٹریڈنگ',
    shopNumberPlaceholder: 'مثلاً: اسٹال #27، گیٹ 3',
    marketYardPlaceholder: 'مثلاً: ہول سیل مارکیٹ یارڈ',
    shopAddressPlaceholder: 'مثلاً: دکان #1، مارکیٹ یارڈ',

    btnNext: 'آگے',
    btnBack: 'پیچھے',
    btnGetOtp: 'ون ٹائم تصدیقی OTP حاصل کریں',
    alreadyHaveAccount: 'پہلے سے اکاؤنٹ ہے؟',
    loginLink: 'لاگ ان کریں',

    errFullNameRequired: 'برائے مہربانی اپنا پورا نام درج کریں',
    errFullNameNoNumbers: 'نام میں ہندسے نہیں ہو سکتے',
    errPhoneRequired: 'معتبر 10 ہندسوں کا بھارتی موبائل نمبر درج کریں (6، 7، 8، یا 9 سے شروع)',
    errPasswordMinLength: 'پاس ورڈ کم از کم 4 حروف کا ہونا چاہیے',
    errPasswordMismatch: 'پاس ورڈ مطابقت نہیں رکھتے!',
    errShopNameRequired: 'برائے مہربانی اپنی دکان کا نام درج کریں',
    errMarketYardRequired: 'برائے مہربانی منڈی کا نام درج کریں',
    errShopAddressRequired: 'برائے مہربانی پتہ درج کریں',

    otpHeading: 'ون ٹائم تصدیقی OTP',
    otpSubtitle: (phone) => `+91 ${phone} پر بھیجا گیا 6 ہندسوں کا کوڈ درج کریں`,
    btnVerifyOtp: 'OTP کی تصدیق کریں & آگے بڑھیں',
    commodityHeading: 'تجارت کی اجناس منتخب کریں',
    commoditySubtitle: 'منڈی میں فروخت ہونے والی فصلیں منتخب کریں',
    btnCompleteSignup: 'منڈی سائن اپ مکمل کریں',
  },
  mai: {
    merchantSignUp: 'व्यापारी साइन अप',
    stepOf4: (current) => `चरण ${current} / 4`,
    heading: 'अपन मंडी व्यापारी खाता बनाबू',
    subtitle: 'अपन थोक मंडी दुकान पंजीकृत करू',
    step1Title: 'व्यक्तिगत विवरण',
    step1Desc: 'अपन पूरा नाम आ मोबाइल नंबर दर्ज करू',
    step2Title: 'पासवर्ड',
    step2Desc: 'सुरक्षित पासवर्ड सेट करू',
    step3Title: 'दुकान विवरण',
    step3Desc: 'दुकानक नाम दर्ज करू',
    step4Title: 'मंडी विवरण',
    step4Desc: 'अपन राज्य आ मंडी चुनू',

    fullNameLabel: 'पूरा नाम (मालिक / व्यापारी) *',
    mobileLabel: 'मोबाइल नंबर (10 अंक) *',
    emailLabel: 'ईमेल पता (वैकल्पिक)',
    passwordLabel: 'लॉगिन पासवर्ड बनाबू *',
    confirmPasswordLabel: 'पासवर्ड पुनः दर्ज करू *',
    shopNameLabel: 'दुकान / फर्मक नाम *',
    shopNumberLabel: 'दुकान / स्टॉल संख्या',
    stateLabel: 'राज्य *',
    marketYardLabel: 'मार्केट यार्ड / मंडीक नाम *',
    shopAddressLabel: 'दुकानक पूरा पता *',

    fullNamePlaceholder: 'जैसे: रमेश कुमार',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'जैसे: ramesh@manditrader.com',
    passwordPlaceholder: 'पासवर्ड बनाबू',
    confirmPasswordPlaceholder: 'वही पासवर्ड दोबारा दर्ज करू',
    shopNamePlaceholder: 'जैसे: श्री वेंकटेश्वर ट्रेडिंग',
    shopNumberPlaceholder: 'जैसे: स्टॉल #27, गेट 3',
    marketYardPlaceholder: 'जैसे: थोक मंडी प्रांगण',
    shopAddressPlaceholder: 'जैसे: दुकान #1, मंडी प्रांगण',

    btnNext: 'आगे बढ़ू',
    btnBack: 'पाछा जाबू',
    btnGetOtp: 'एक-बार सत्यापन OTP प्राप्त करू',
    alreadyHaveAccount: 'पहले सँ खाता अछि?',
    loginLink: 'लॉगिन करू',

    errFullNameRequired: 'कृपया अपन पूरा नाम दर्ज करू',
    errFullNameNoNumbers: 'नाम में संख्या नहि भऽ सकैत अछि',
    errPhoneRequired: 'वैध 10-अंकीय भारतीय मोबाइल नंबर दर्ज करू (6, 7, 8, या 9 सँ शुरू)',
    errPasswordMinLength: 'पासवर्ड कम सँ कम 4 अक्षर होना आवश्यक अछि',
    errPasswordMismatch: 'पासवर्ड मेल नहि खा रहल अछि!',
    errShopNameRequired: 'कृपया अपन दुकानक नाम दर्ज करू',
    errMarketYardRequired: 'कृपया मंडीक नाम दर्ज करू',
    errShopAddressRequired: 'कृपया दुकानक पता दर्ज करू',

    otpHeading: 'एक-बार सत्यापन OTP',
    otpSubtitle: (phone) => `+91 ${phone} पर पठाओल गेल 6-अंकीय कोड दर्ज करू`,
    btnVerifyOtp: 'OTP सत्यापित करू आ आगे बढ़ू',
    commodityHeading: 'व्यापार कयल जाय वाला फसल चुनू',
    commoditySubtitle: 'मंडी में बेचल जाय वाला उत्पाद चुनू',
    btnCompleteSignup: 'मंडी साइन अप पूरा करू',
  },
  sat: {
    merchantSignUp: 'ᱵᱮᱯᱟᱨᱤ ᱥᱟᱭᱤᱱ ᱟᱯ',
    stepOf4: (current) => `ᱫᱷᱟᱯ ${current} / 4`,
    heading: 'ᱟᱢᱟᱜ ᱢᱟᱱᱰᱤ ᱵᱮᱯᱟᱨᱤ ᱠᱷᱟᱛᱟ ᱵᱮᱱᱟᱣ ᱢᱮ',
    subtitle: 'ᱟᱢᱟᱜ ᱢᱟᱱᱰᱤ ᱫᱩᱠᱟᱱ ᱨᱮᱡᱤᱥᱴᱟᱨ ᱢᱮ',
    step1Title: 'ᱱᱤᱡᱮᱨᱟᱜ ᱵᱤᱵᱚᱨᱚᱱ',
    step1Desc: 'ᱟᱢᱟᱜ ᱯᱩᱨᱟᱹ ᱧᱩᱛᱩᱢ ᱟᱨ ᱢᱚᱵᱟᱭᱤᱞ ᱱᱚᱢᱵᱚᱨ ᱮᱢ ᱢᱮ',
    step2Title: 'ᱯᱟᱥᱣᱟᱨᱰ',
    step2Desc: 'ᱞᱚᱜᱤᱱ ᱯᱟᱥᱣᱟᱨᱰ ᱥᱮᱴ ᱢᱮ',
    step3Title: 'ᱫᱩᱠᱟᱱ ᱵᱤᱵᱚᱨᱚᱱ',
    step3Desc: 'ᱫᱩᱠᱟᱱ ᱧᱩᱛᱩᱢ ᱮᱢ ᱢᱮ',
    step4Title: 'ᱢᱟᱱᱰᱤ ᱵᱤᱵᱚᱨᱚᱱ',
    step4Desc: 'ᱢᱟᱱᱰᱤ ᱟᱨ ᱴᱷᱤᱠᱟᱹᱱᱟ ᱪᱚᱭᱚᱱ ᱢᱮ',

    fullNameLabel: 'ᱯᱩᱨᱟᱹ ᱧᱩᱛᱩᱢ (ᱢᱟᱞᱤᱠ / ᱵᱮᱯᱟᱨᱤ) *',
    mobileLabel: 'ᱢᱚᱵᱟᱭᱤᱞ ᱱᱚᱢᱵᱚᱨ (10 ᱰᱤᱡᱤᱴ) *',
    emailLabel: 'ᱤᱢᱮᱞ ᱴᱷᱤᱠᱟᱹᱱᱟ (ᱚᱯᱥᱚᱱᱟᱞ)',
    passwordLabel: 'ᱞᱚᱜᱤᱱ ᱯᱟᱥᱣᱟᱨᱰ ᱵᱮᱱᱟᱣ ᱢᱮ *',
    confirmPasswordLabel: 'ᱯᱟᱥᱣᱟᱨᱰ ᱫᱚᱦᱲᱟ ᱮᱢ ᱢᱮ *',
    shopNameLabel: 'ᱫᱩᱠᱟᱱ / ᱯᱷᱟᱨᱢ ᱧᱩᱛᱩᱢ *',
    shopNumberLabel: 'ᱫᱩᱠᱟᱱ / ᱥᱴᱚᱞ ᱱᱚᱢᱵᱚᱨ',
    stateLabel: 'ᱯᱚᱱᱚᱛ *',
    marketYardLabel: 'ᱢᱟᱨᱠᱮᱴ ᱭᱟᱨᱰ / ᱢᱟᱱᱰᱤ ᱧᱩᱛᱩᱢ *',
    shopAddressLabel: 'ᱫᱩᱠᱟᱱ ᱨᱮᱱᱟᱜ ᱯᱩᱨᱟᱹ ᱴᱷᱤᱠᱟᱹᱱᱟ *',

    fullNamePlaceholder: 'ᱡᱮᱞᱮᱠᱟ: ᱨᱟᱢᱮᱥ ᱠᱩᱢᱟᱨ',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'ᱡᱮᱞᱮᱠᱟ: ramesh@manditrader.com',
    passwordPlaceholder: 'ᱯᱟᱥᱣᱟᱨᱰ ᱥᱮᱴ ᱢᱮ',
    confirmPasswordPlaceholder: 'ᱚᱱᱟ ᱯᱟᱥᱣᱟᱨᱰ ᱜᱮ ᱫᱚᱦᱲᱟ ᱮᱢ ᱢᱮ',
    shopNamePlaceholder: 'ᱡᱮᱞᱮᱠᱟ: ᱥᱨᱤ ᱵᱮᱝᱠᱚᱴᱮᱥᱣᱚᱨ ᱴᱨᱮᱰᱤᱝ',
    shopNumberPlaceholder: 'ᱡᱮᱞᱮᱠᱟ: ᱥᱴᱚᱞ #27, ᱜᱮᱴ 3',
    marketYardPlaceholder: 'ᱡᱮᱞᱮᱠᱟ: ᱦᱳᱞᱥᱮᱞ ᱢᱟᱨᱠᱮᱴ',
    shopAddressPlaceholder: 'ᱡᱮᱞᱮᱠᱟ: ᱫᱩᱠᱟᱱ #1, ᱢᱟᱨᱠᱮᱴ ᱭᱟᱨᱰ',

    btnNext: 'ᱞᱟᱦᱟ',
    btnBack: 'ᱛᱟᱭᱚᱢ',
    btnGetOtp: 'ᱢᱤᱫ-ᱫᱷᱟᱣ ᱡᱟᱸᱪ OTP ᱧᱟᱢ ᱢᱮ',
    alreadyHaveAccount: 'ᱢᱟᱲᱟᱝ ᱠᱷᱚᱱ ᱠᱷᱟᱛᱟ ᱢᱮᱱᱟᱜᱼᱟ?',
    loginLink: 'ᱞᱚᱜᱤᱱ ᱢᱮ',

    errFullNameRequired: 'ᱫᱚᱭᱟ ᱠᱟᱛᱮ ᱟᱢᱟᱜ ᱯᱩᱨᱟᱹ ᱧᱩᱛᱩᱢ ᱮᱢ ᱢᱮ',
    errFullNameNoNumbers: 'ᱧᱩᱛᱩᱢ ᱨᱮ ᱱᱚᱢᱵᱚᱨ ᱵᱟᱝ ᱛᱟᱦᱮᱸ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ',
    errPhoneRequired: '10 ᱰᱤᱡᱤᱴ ᱨᱮᱱᱟᱜ ᱥᱟᱹᱨᱤ ᱤᱱᱰᱤᱭᱟᱱ ᱢᱚᱵᱟᱭᱤᱞ ᱱᱚᱢᱵᱚᱨ ᱮᱢ ᱢᱮ (6, 7, 8, 9 ᱠᱷᱚᱱ ᱮᱛᱚᱦᱚᱵ)',
    errPasswordMinLength: 'ᱯᱟᱥᱣᱟᱨᱰ ᱠᱚᱢ ᱠᱷᱚᱱ ᱠᱚᱢ 4 ᱴᱟᱠᱷᱚᱨ ᱦᱩᱭᱩᱜ ᱞᱟᱹᱠᱛᱤᱭᱟ',
    errPasswordMismatch: 'ᱯᱟᱥᱣᱟᱨᱰ ᱵᱟᱝ ᱢᱤᱞᱟᱹᱣ ᱠᱟᱱᱟ!',
    errShopNameRequired: 'ᱫᱚᱭᱟ ᱠᱟᱛᱮ ᱫᱩᱠᱟᱱ ᱧᱩᱛᱩᱢ ᱮᱢ ᱢᱮ',
    errMarketYardRequired: 'ᱫᱚᱭᱟ ᱠᱟᱛᱮ ᱢᱟᱱᱰᱤ ᱧᱩᱛᱩᱢ ᱮᱢ ᱢᱮ',
    errShopAddressRequired: 'ᱫᱚᱭᱟ ᱠᱟᱛᱮ ᱴᱷᱤᱠᱟᱹᱱᱟ ᱮᱢ ᱢᱮ',

    otpHeading: 'ᱢᱤᱫ-ᱫᱷᱟᱣ ᱡᱟᱸᱪ OTP',
    otpSubtitle: (phone) => `+91 ${phone} ᱨᱮ ᱵᱷᱮᱡᱟ ᱟᱠᱟᱱ 6 ᱰᱤᱡᱤᱴ ᱠᱳᱰ ᱮᱢ ᱢᱮ`,
    btnVerifyOtp: 'OTP ᱡᱟᱸᱪ ᱢᱮ & ᱞᱟᱦᱟᱜ ᱢᱮ',
    commodityHeading: 'ᱵᱮᱯᱟᱨᱮᱫ ᱯᱷᱚᱥᱚᱞ ᱪᱚᱭᱚᱱ ᱢᱮ',
    commoditySubtitle: 'ᱢᱟᱱᱰᱤ ᱨᱮ ᱟᱹᱠᱷᱨᱤᱧᱚᱜ ᱠᱟᱱ ᱡᱤᱱᱤᱥ ᱪᱚᱭᱚᱱ ᱢᱮ',
    btnCompleteSignup: 'ᱢᱟᱱᱰᱤ ᱥᱟᱭᱤᱱ ᱟᱯ ᱯᱩᱨᱟᱹᱣ ᱢᱮ',
  },
  ks: {
    merchantSignUp: 'تاجر سائن اپ',
    stepOf4: (current) => `مرحلہ ${current} / 4`,
    heading: 'منڈی تاجر اکاؤنٹ بناوِو',
    subtitle: 'پننہ منڈی دکان رجسٹر کریو',
    step1Title: 'ذاتی تفصیلات',
    step1Desc: 'پورا ناو تہٕ موبائل نمبر درج کریو',
    step2Title: 'پاسورڈ',
    step2Desc: 'لاگ ان پاسورڈ سیٹ کریو',
    step3Title: 'دکان تفصیلات',
    step3Desc: 'دکان ناو درج کریو',
    step4Title: 'منڈی تفصیلات',
    step4Desc: 'منڈی تہٕ پتہ منتخب کریو',

    fullNameLabel: 'پورا ناو (مالک / تاجر) *',
    mobileLabel: 'موبائل نمبر (10 ہندسے) *',
    emailLabel: 'ای میل پتہ (اختیاری)',
    passwordLabel: 'لاگ ان پاسورڈ بناوِو *',
    confirmPasswordLabel: 'پاسورڈ تصدیق کریو *',
    shopNameLabel: 'دکان / فرم ناو *',
    shopNumberLabel: 'دکان / اسٹال نمبر',
    stateLabel: 'ریاست *',
    marketYardLabel: 'مارکیٹ یارڈ / منڈی ناو *',
    shopAddressLabel: 'دکانک مکمل پتہ *',

    fullNamePlaceholder: 'مثلاً: رمیش کمار',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'مثلاً: ramesh@manditrader.com',
    passwordPlaceholder: 'پاسورڈ درج کریو',
    confirmPasswordPlaceholder: 'سوئی پاسورڈ دوبارہ درج کریو',
    shopNamePlaceholder: 'مثلاً: شری وینکٹیشور ٹریڈنگ',
    shopNumberPlaceholder: 'مثلاً: اسٹال #27، گیٹ 3',
    marketYardPlaceholder: 'مثلاً: ہول سیل مارکیٹ',
    shopAddressPlaceholder: 'مثلاً: دکان #1، مارکیٹ یارڈ',

    btnNext: 'برونہہ',
    btnBack: 'پتھ',
    btnGetOtp: 'ایک-بار تصدیقی OTP حاصل کریو',
    alreadyHaveAccount: 'برونہہ اکاؤنٹ چھا؟',
    loginLink: 'لاگ ان کریو',

    errFullNameRequired: 'مہربانی کٔرتھ پنُن پورا ناو درج کریو',
    errFullNameNoNumbers: 'ناوس منز ہیکہِ نہٕ ہندسہِ ٲستھ',
    errPhoneRequired: '10 ہندسین ہند معتبر بھارتی موبائل نمبر درج کریو (6، 7، 8، یا 9 پیٹھہٕ شروع)',
    errPasswordMinLength: 'پاسورڈ گژھہِ کم از کم 4 حرفن ہند ٲسنہٕ',
    errPasswordMismatch: 'پاسورڈ چھُ نہٕ رلان!',
    errShopNameRequired: 'مہربانی کٔرتھ دکان ناو درج کریو',
    errMarketYardRequired: 'مہربانی کٔرتھ منڈی ناو درج کریو',
    errShopAddressRequired: 'مہربانی کٔرتھ پتہ درج کریو',

    otpHeading: 'ایک-بار تصدیقی OTP',
    otpSubtitle: (phone) => `+91 ${phone} پؠٹھ سوزنہٕ آمُت 6 ہندسین ہند کوڈ درج کریو`,
    btnVerifyOtp: 'OTP تصدیق کریو & برونہہ پکِو',
    commodityHeading: 'تجارت کی اجناس منتخب کریو',
    commoditySubtitle: 'منڈی منز کٕنن واجؠن فصلن ہند انتخاب کریو',
    btnCompleteSignup: 'منڈی سائن اپ مکمل کریو',
  },
  ne: {
    merchantSignUp: 'व्यापारी साइन अप',
    stepOf4: (current) => `चरण ${current} / 4`,
    heading: 'आफ्नो मण्डी व्यापारी खाता बनाउनुहोस्',
    subtitle: 'आफ्नो थोक मण्डी पसल दर्ता गर्नुहोस्',
    step1Title: 'व्यक्तिगत विवरण',
    step1Desc: 'आफ्नो पूरा नाम र मोबाइल नम्बर राख्नुहोस्',
    step2Title: 'पासवर्ड',
    step2Desc: 'लगइन पासवर्ड सेट गर्नुहोस्',
    step3Title: 'पसल विवरण',
    step3Desc: 'पसलको नाम राख्नुहोस्',
    step4Title: 'मण्डी विवरण',
    step4Desc: 'मण्डी र ठेगाना छान्नुहोस्',

    fullNameLabel: 'पूरा नाम (मालिक / व्यापारी) *',
    mobileLabel: 'मोबाइल नम्बर (१० अंक) *',
    emailLabel: 'इमेल ठेगाना (ऐच्छिक)',
    passwordLabel: 'लगइन पासवर्ड बनाउनुहोस् *',
    confirmPasswordLabel: 'पासवर्ड पुनः राख्नुहोस् *',
    shopNameLabel: 'पसल / फर्मको नाम *',
    shopNumberLabel: 'पसल / स्टल नम्बर',
    stateLabel: 'राज्य *',
    marketYardLabel: 'मार्केट यार्ड / मण्डीको नाम *',
    shopAddressLabel: 'पसलको पूरा ठेगाना *',

    fullNamePlaceholder: 'जस्तै: रमेश कुमार',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'जस्तै: ramesh@manditrader.com',
    passwordPlaceholder: 'पासवर्ड सेट गर्नुहोस्',
    confirmPasswordPlaceholder: 'उही पासवर्ड पुनः राख्नुहोस्',
    shopNamePlaceholder: 'जस्तै: श्री वेङ्कटेश्वर ट्रेडिङ',
    shopNumberPlaceholder: 'जस्तै: स्टल #२७, गेट ३',
    marketYardPlaceholder: 'जस्तै: थोक मण्डी प्राङ्गण',
    shopAddressPlaceholder: 'जस्तै: पसल #१, मण्डी प्राङ्गण',

    btnNext: 'अगाडि',
    btnBack: 'पछाडि',
    btnGetOtp: 'एक-पटक प्रमाणीकरण OTP प्राप्त गर्नुहोस्',
    alreadyHaveAccount: 'पहिले नै खाता छ?',
    loginLink: 'लगइन गर्नुहोस्',

    errFullNameRequired: 'कृपया आफ्नो पूरा नाम राख्नुहोस्',
    errFullNameNoNumbers: 'नाममा अंक हुनुहुँदैन',
    errPhoneRequired: 'मान्य १०-अङ्कको भारतीय मोबाइल नम्बर राख्नुहोस् (६, ७, ८, वा ९ बाट सुरु)',
    errPasswordMinLength: 'पासवर्ड कम्तिमा ४ अक्षरको हुनुपर्छ',
    errPasswordMismatch: 'पासवर्ड मिलेन!',
    errShopNameRequired: 'कृपया पसलको नाम राख्नुहोस्',
    errMarketYardRequired: 'कृपया मण्डीको नाम राख्नुहोस्',
    errShopAddressRequired: 'कृपया ठेगाना राख्नुहोस्',

    otpHeading: 'एक-पटक प्रमाणीकरण OTP',
    otpSubtitle: (phone) => `+91 ${phone} मा पठाइएको ६ अंकको कोड राख्नुहोस्`,
    btnVerifyOtp: 'OTP प्रमाणीकरण गर्नुहोस् & अगाडि बढ्नुहोस्',
    commodityHeading: 'व्यापार गर्ने बाली छान्नुहोस्',
    commoditySubtitle: 'मण्डीमा बिक्री हुने उपज छान्नुहोस्',
    btnCompleteSignup: 'मण्डी साइन अप पूरा गर्नुहोस्',
  },
  kok: {
    merchantSignUp: 'वेपारी सायन अप',
    stepOf4: (current) => `पावंडो ${current} / 4`,
    heading: 'तुमचें मंडी वेपारी खातें तयार करात',
    subtitle: 'तुमचें मंडी दुकान नोंदव्यात',
    step1Title: 'व्यक्तिगत माहिती',
    step1Desc: 'तुमचें पुराय नांव आणी मोबाईल नंबर घालात',
    step2Title: 'पासवर्ड',
    step2Desc: 'लॉगिन पासवर्ड सेट करात',
    step3Title: 'दुकानाची माहिती',
    step3Desc: 'दुकानाचें नांव घालात',
    step4Title: 'मंडीची माहिती',
    step4Desc: 'मंडी आणी पत्तो निवडाात',

    fullNameLabel: 'पुराय नांव (धनी / वेपारी) *',
    mobileLabel: 'मोबाईल नंबर (10 आंकडे) *',
    emailLabel: 'ईमेल पत्तो (ऐच्छिक)',
    passwordLabel: 'लॉगिन पासवर्ड तयार करात *',
    confirmPasswordLabel: 'पासवर्ड परत घालात *',
    shopNameLabel: 'दुकान / फर्मान्चें नांव *',
    shopNumberLabel: 'दुकान / स्टॉल नंबर',
    stateLabel: 'राज्य *',
    marketYardLabel: 'मार्केट यार्ड / मंडीचें नांव *',
    shopAddressLabel: 'दुकानाचा पुराय पत्तो *',

    fullNamePlaceholder: 'देखील: रमेश कुमार',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'देखील: ramesh@manditrader.com',
    passwordPlaceholder: 'पासवर्ड सेट करात',
    confirmPasswordPlaceholder: 'तोच पासवर्ड परत घालात',
    shopNamePlaceholder: 'देखील: श्री व्यंकटेश्वर ट्रेडिंग',
    shopNumberPlaceholder: 'देखील: स्टॉल #27, गेट 3',
    marketYardPlaceholder: 'देखील: होलसेल मार्केट',
    shopAddressPlaceholder: 'देखील: दुकान #1, मार्केट यार्ड',

    btnNext: 'मुखार',
    btnBack: 'फाटीं',
    btnGetOtp: 'वन-टाईम तपासणी OTP मेळवाात',
    alreadyHaveAccount: 'पयलींच खातें आसा?',
    loginLink: 'लॉगिन करात',

    errFullNameRequired: 'उपकार करून तुमचें पुराय नांव घालात',
    errFullNameNoNumbers: 'नांवांत आंकडे आसूंक नजॉत',
    errPhoneRequired: 'सारको 10-आंकड्यांचो भारतीय मोबाईल नंबर घालात (6, 7, 8, वा 9 थान सुरू)',
    errPasswordMinLength: 'पासवर्ड उण्यांत उणो 4 अक्षरांचो आसूंक जाय',
    errPasswordMismatch: 'पासवर्ड जुळनात!',
    errShopNameRequired: 'उपकार करून दुकानाचें नांव घालात',
    errMarketYardRequired: 'उपकार करून मंडीचें नांव घालात',
    errShopAddressRequired: 'उपकार करून पत्तो घालात',

    otpHeading: 'वन-टाईम तपासणी OTP',
    otpSubtitle: (phone) => `+91 ${phone} रार धाडिल्लो 6-आंकड्यांचो कोड घालात`,
    btnVerifyOtp: 'OTP तपासात & मुखार वचाात',
    commodityHeading: 'व्यापार करपाची पिकां निवडाात',
    commoditySubtitle: 'मंडींत विक्री करपाचो माल निवडाात',
    btnCompleteSignup: 'मंडी सायन अप पुराय करात',
  },
  doi: {
    merchantSignUp: 'व्यापारी साइन अप',
    stepOf4: (current) => `चरण ${current} / 4`,
    heading: 'अपना मंडी व्यापारी खाता बनाओ',
    subtitle: 'अपनी मंडी दुकान पंजीकृत करो',
    step1Title: 'व्यक्तिगत विवरण',
    step1Desc: 'अपना पूरा नांअ ते मोबाइल नंबर पाओ',
    step2Title: 'पासवर्ड',
    step2Desc: 'लॉगिन पासवर्ड सेट करो',
    step3Title: 'दुकान विवरण',
    step3Desc: 'दुकान दा नांअ पाओ',
    step4Title: 'मंडी विवरण',
    step4Desc: 'मंडी ते पता चुनो',

    fullNameLabel: 'पूरा नांअ (मालिक / व्यापारी) *',
    mobileLabel: 'मोबाइल नंबर (10 अंक) *',
    emailLabel: 'ईमेल पता (ऐच्छिक)',
    passwordLabel: 'लॉगिन पासवर्ड बनाओ *',
    confirmPasswordLabel: 'पासवर्ड दोबारा पाओ *',
    shopNameLabel: 'दुकान / फर्म दा नांअ *',
    shopNumberLabel: 'दुकान / स्टॉल नंबर',
    stateLabel: 'राज्य *',
    marketYardLabel: 'मार्केट यार्ड / मंडी दा नांअ *',
    shopAddressLabel: 'दुकान दा पूरा पता *',

    fullNamePlaceholder: 'जिच्छन: रमेश कुमार',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'जिच्छन: ramesh@manditrader.com',
    passwordPlaceholder: 'पासवर्ड सेट करो',
    confirmPasswordPlaceholder: 'ओह गै पासवर्ड दोबारा पाओ',
    shopNamePlaceholder: 'जिच्छन: श्री वेंकटेश्वर ट्रेडिंग',
    shopNumberPlaceholder: 'जिच्छन: स्टॉल #27, गेट 3',
    marketYardPlaceholder: 'जिच्छन: थोक मंडी यार्ड',
    shopAddressPlaceholder: 'जिच्छन: दुकान #1, मंडी यार्ड',

    btnNext: 'अग्गें',
    btnBack: 'पिच्छें',
    btnGetOtp: 'इक्क-बारी जांच OTP हासिल करो',
    alreadyHaveAccount: 'पैलें थमा खाता ऐ?',
    loginLink: 'लॉगिन करो',

    errFullNameRequired: 'किरपा करियै अपना पूरा नांअ पाओ',
    errFullNameNoNumbers: 'नांअ च अंक नेईं होई सकदे',
    errPhoneRequired: 'मान्य 10-अंकें दा भारतीय मोबाइल नंबर पाओ (6, 7, 8, या 9 थमां शुरू)',
    errPasswordMinLength: 'पासवर्ड घट्ट-शा-घट्ट 4 अक्खरें दा होना चाहिदा',
    errPasswordMismatch: 'पासवर्ड मेल नेईं खांदे!',
    errShopNameRequired: 'किरपा करियै दुकान दा नांअ पाओ',
    errMarketYardRequired: 'किरपा करियै मंडी दा नांअ पाओ',
    errShopAddressRequired: 'किरपा करियै पता पाओ',

    otpHeading: 'इक्क-बारी जांच OTP',
    otpSubtitle: (phone) => `+91 ${phone} पर भेजेदा 6-अंकें दा कोड पाओ`,
    btnVerifyOtp: 'OTP जांचो ते अग्गें बधो',
    commodityHeading: 'व्यापार आह्ली फसल चुनो',
    commoditySubtitle: 'मंडी च बिक्कने आह्ली उपज चुनो',
    btnCompleteSignup: 'मंडी साइन अप पूरा करो',
  },
  mni: {
    merchantSignUp: 'ᱞꯥꯂꯩꯕ ꯁꯥꯏꯟ ꯑꯞ',
    stepOf4: (current) => `ꯈꯣꯡꯊꯥꯡ ${current} / 4`,
    heading: 'ꯅꯍꯥꯛꯀꯤ ꯃꯟꯗꯤ ꯃꯔꯆꯦꯟ꯭ꯇ ꯑꯀꯥꯎꯟ꯭ꯇ ꯁꯦᱢꯕꯤꯌꯨ',
    subtitle: 'ꯅꯍꯥꯛꯀꯤ ꯃꯟꯗꯤ ꯗꯨꯀꯥꯟ ꯔꯦꯖꯤꯁ꯭ꯇꯔ ꯇꯧꯕꯤꯌꯨ',
    step1Title: 'ꯏꯁꯥꯒꯤ ꯑꯀꯨꯞꯄ ꯃꯔꯣꯜ',
    step1Desc: 'ꯃꯃꯤꯡ ꯑꯃꯁꯨꯡ ꯃꯣꯕꯥꯏꯜ ꯅꯝꯕꯔ ꯏꯕꯤꯌꯨ',
    step2Title: 'ꯄꯥꯁꯋꯥꯔ꯭ꯗ',
    step2Desc: 'ꯂꯣꯒꯏꯟ ꯄꯥꯁꯋꯥꯔ꯭ꯗ ꯁꯦꯠ ꯇꯧꯕꯤꯌꯨ',
    step3Title: 'ꯗꯨꯀꯥꯟꯒꯤ ꯃꯔꯣꯜ',
    step3Desc: 'ꯗꯨꯀꯥꯟꯒꯤ ꯃꯃꯤꯡ ꯏꯕꯤꯌꯨ',
    step4Title: 'ꯃꯥꯔꯀꯦꯠꯀꯤ ꯃꯔꯣꯜ',
    step4Desc: 'ꯃꯟꯗꯤ ꯑꯃꯁꯨꯡ ꯂꯩꯐꯝ ꯈꯟꯕꯤꯌꯨ',

    fullNameLabel: 'ꯑꯄꯨꯟꯕ ꯃꯃꯤꯡ (ꯃꯄꯨ / ꯂꯥꯂꯩꯕ) *',
    mobileLabel: 'ꯃꯣꯕꯥꯏꯜ ꯅꯝꯕꯔ (10 ꯗꯤꯖꯤꯠ) *',
    emailLabel: 'ꯏꯃꯦꯜ ꯑꯦꯗ꯭ꯔꯦꯁ (ꯑꯣꯞꯁꯅꯦꯜ)',
    passwordLabel: 'ꯂꯣꯒꯏꯟ ꯄꯥꯁꯋꯥꯔ꯭ꯗ ꯁꯦᱢꯕꯤꯌꯨ *',
    confirmPasswordLabel: 'ꯄꯥꯁꯋꯥꯔ꯭ꯗ ꯑꯃꯨꯛ ꯏꯕꯤꯌꯨ *',
    shopNameLabel: 'ꯗꯨꯀꯥꯟ / ꯐꯔ꯭ᱢꯒꯤ ꯃꯃꯤꯡ *',
    shopNumberLabel: 'ꯗꯨꯀꯥꯟ / ꯁ꯭ꯇꯣꯜ ꯅꯝꯕꯔ',
    stateLabel: 'ꯁ꯭ꯇꯦꯠ *',
    marketYardLabel: 'ꯃꯥꯔꯀꯦꯠ ꯌꯥꯔ꯭ꯗ / ꯃꯟꯗꯤ ꯃꯃꯤꯡ *',
    shopAddressLabel: 'ꯗꯨꯀꯥꯟꯒꯤ ꯑꯄꯨꯟꯕ ꯂꯩꯐꯝ *',

    fullNamePlaceholder: 'ꯈꯨꯗꯝ: ꯔꯃꯦꯁ ꯀꯨꯃꯥꯔ',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'ꯈꯨꗯ: ramesh@manditrader.com',
    passwordPlaceholder: 'ꯄꯥꯁꯋꯥꯔ꯭ꯗ ꯁꯦꯠ ꯇꯧꯕꯤꯌꯨ',
    confirmPasswordPlaceholder: 'ꯑꯗꯨꯃꯛ ꯑꯃꯨꯛ ꯏꯕꯤꯌꯨ',
    shopNamePlaceholder: 'ꯈꯨꯗꝨ: ꯁ꯭ꯔꯤ ꯋꯦꯡꯀꯇꯦꯁ꯭ꯋꯔ ꯇ꯭ꯔꯦꯗꯤꯡ',
    shopNumberPlaceholder: 'ꯈꯨꯗꯝ: ꯁ꯭ꯇꯣꯜ #27, ꯒꯦꯠ 3',
    marketYardPlaceholder: 'ꯈꯨꯗꯝ: ꯍꯣꯜꯁꯦꯜ ꯃꯥꯔꯀꯦꯠ',
    shopAddressPlaceholder: 'ꯈꯨꯗꯝ: ꯗꯨꯀꯥꯟ #1, ꯃꯥꯔꯀꯦꯠ ꯌꯥꯔ꯭ꯗ',

    btnNext: 'ꯃꯥꯡꯗꯥ',
    btnBack: 'ꯇꯨꯡꯗꯥ',
    btnGetOtp: 'ꯑꯃꯛ-ꯈꯛꯇ ꯆꯦꯛ ꯇꯧꯕ OTP ꯂꯧꯕꯤꯌꯨ',
    alreadyHaveAccount: 'ꯃꯃꯥꯡꯗꯒꯤ ꯑꯀꯥꯎꯟ꯭ꯇ ꯂꯩꯕ꯭ꯔꯥ?',
    loginLink: 'ꯂꯣꯒꯏꯟ ꯇꯧꯕꯤꯌꯨ',

    errFullNameRequired: 'ꯆꯥꯅꯕꯤꯗꯨꯅ ꯑꯄꯨꯟꯕ ꯃꯃꯤꯡ ꯏꯕꯤꯌꯨ',
    errFullNameNoNumbers: 'ꯃꯃꯤꯡꯗ ꯃꯁꯤꯡ ꯌꯥꯎꯕ ꯌꯥꯔꯣꯏ',
    errPhoneRequired: '10 ꯗꯤꯖꯤꯠꯀꯤ ꯑꯆᱩꯝꯕ ꯏꯟꯗꯤꯌꯥꯟ ꯃꯣꯕꯥꯏꯜ ꯅꯝꯕꯔ ꯏꯕꯤꯌꯨ (6, 7, 8, ꯅꯠꯇ꯭ꯔꯒ 9 ꯗꯒꯤ ꯍꯧꯕ)',
    errPasswordMinLength: 'ꯄꯥꯁꯋꯥꯔ꯭ꯗ ꯌꯥꯝꯗ꯭ꯔꯕꯗ ꯃꯌꯦꯛ 4 ꯑꯣꯏꯒꯗꯕꯅꯤ',
    errPasswordMismatch: 'ꯄꥥꯁꯋꯥꯔ꯭ꯗ ꯃꯥꯟꯅꯗ꯭ꯔꯦ!',
    errShopNameRequired: 'ꯆꯥꯅꯕꯤꯗꯨꯅ ꯗꯨꯀꥥꯟ ꯃꯃꯤꯡ ꯏꯕꯤꯌꯨ',
    errMarketYardRequired: 'ꯆꯥꯅꯕꯤꯗꯨꯅ ꯃꯟꯗꯤ ꯃꯃꯤꯡ ꯏꯕꯤꯌꯨ',
    errShopAddressRequired: 'ꯆꯥꯅꯕꯤꯗꯨꯅ ꯂꯩꯐꯝ ꯏꯕꯤꯌꯨ',

    otpHeading: 'ꯑꯃꯛ-ꯈꯛꯇ ꯆꯦꯛ ꯇꯧꯕ OTP',
    otpSubtitle: (phone) => `+91 ${phone} ꯗ ꯊꯥꯔꯛꯄ 6 ꯗꯤꯖꯤꯠ ꯀꯣꯗ ꯏꯕꯤꯌꯨ`,
    btnVerifyOtp: 'OTP ꯆꯦꯛ ꯇꯧꯕꯤꯌꯨ & ꯃꯥꯡꯗꯥ ꯆꯠꯄꯤꯌꯨ',
    commodityHeading: 'ꯂꯥꯂꯩ-ꯏꯇꯤꯛ ꯇꯧꯕ ꯄꯣꯠꯊꯣꯛ ꯈꯟꯕꯤꯌꯨ',
    commoditySubtitle: 'ꯃꯥꯔꯀꯦꯠꯇ ꯌꯣꯟꯕ ꯄꯣꯠꯊꯣꯛꯁꯤꯡ ꯈꯟꯕꯤꯌꯨ',
    btnCompleteSignup: 'ꯃꯟꯗꯤ ꯁꯥꯏꯟ ꯑꯞ ꯂꯣꯏꯁꯤꯟꯕꯤꯌꯨ',
  },
  brx: {
    merchantSignUp: 'फालांगिरि साइन आप',
    stepOf4: (current) => `खोन्दोब ${current} / 4`,
    heading: 'नोंथांनि मन्दि फालांगिरि एकाउन्ट सोरजौ',
    subtitle: 'नोंथांनि मन्दि दुलारि दकान रेजिस्टार खालाम',
    step1Title: 'गावनि विवरण',
    step1Desc: 'मुं आरो मबाइल नम्बर लिर',
    step2Title: 'पासवार्ड',
    step2Desc: 'लगइन पासवार्ड सेट खालाम',
    step3Title: 'दकान विवरण',
    step3Desc: 'दकाननि मुं लिर',
    step4Title: 'हाथाय विवरण',
    step4Desc: 'मन्दि आरो ठिकाना सायखौ',

    fullNameLabel: 'आबुं मुं (मालिक / फालांगिरि) *',
    mobileLabel: 'मबाइल नम्बर (10 अंक) *',
    emailLabel: 'इमेल ठिकाना (बायदि)',
    passwordLabel: 'लगइन पासवार्ड सोरजौ *',
    confirmPasswordLabel: 'पासवार्ड फिन लिर *',
    shopNameLabel: 'दकान / फार्मनि मुं *',
    shopNumberLabel: 'दकान / स्टल नम्बर',
    stateLabel: 'रायजो *',
    marketYardLabel: 'मार्केट यार्ड / मन्दिनि मुं *',
    shopAddressLabel: 'दकाननि आबुं ठिकाना *',

    fullNamePlaceholder: 'जेरै: रमेश कुमार',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'जेरै: ramesh@manditrader.com',
    passwordPlaceholder: 'पासवार्ड सेट खालाम',
    confirmPasswordPlaceholder: 'बे पासवार्डनो फिन लिर',
    shopNamePlaceholder: 'जेरै: श्री वेंकटेश्वर ट्रेडिं',
    shopNumberPlaceholder: 'जेरै: स्टल #27, गेट 3',
    marketYardPlaceholder: 'जेरै: थोक मार्केट यार्ड',
    shopAddressPlaceholder: 'जेरै: दकान #1, मार्केट यार्ड',

    btnNext: 'सिगांङाव',
    btnBack: 'उनाव',
    btnGetOtp: 'मोनसे-खेब आनजाद OTP मोन्दों',
    alreadyHaveAccount: 'सिगांनिफ्रायनो एकाउन्ट दं?',
    loginLink: 'लगइन खालाम',

    errFullNameRequired: 'अननानै गावनि आबुं मुंखौ लिर',
    errFullNameNoNumbers: 'मुङाव अनजिमा थानो हाया',
    errPhoneRequired: 'गनायथिगोनां 10-अंकनि भारतारि मबाइल नम्बर लिर (6, 7, 8, एबा 9 निफ्राय जागायनाय)',
    errPasswordMinLength: 'पासवार्डा खोमसेयावबो 4 हांखोनि जानांगोन',
    errPasswordMismatch: 'पासवार्डा गोरोबासै!',
    errShopNameRequired: 'अननानै दकाननि मुंखौ लिर',
    errMarketYardRequired: 'अननानै मन्दिनि मुंखौ लिर',
    errShopAddressRequired: 'अननानै ठिकानाखौ लिर',

    otpHeading: 'मोनसे-खेब आनजाद OTP',
    otpSubtitle: (phone) => `+91 ${phone} आव दैथायनाय 6 अंकनि कडाव लिर`,
    btnVerifyOtp: 'OTP आनजाद खालाम & सिगां आवगाय',
    commodityHeading: 'फालांगि खालामनाय फसल सायखौ',
    commoditySubtitle: 'मन्दियाव फाननाय बेसाद सायखौ',
    btnCompleteSignup: 'मन्दि साइन आप फुंखा खालाम',
  },
  sa: {
    merchantSignUp: 'व्यापारी पञ्जीकरणम्',
    stepOf4: (current) => `सोपानम् ${current} / 4`,
    heading: 'स्वकीय मण्डी व्यापारी खाते रचयतु',
    subtitle: 'आपणस्य पञ्जीकरणं करोतु',
    step1Title: 'व्यक्तिगतविवरणम्',
    step1Desc: 'पूर्णनाम चलभाषसङ्ख्यां च लिखतु',
    step2Title: 'कूटशब्दः',
    step2Desc: 'सुरक्षितकूटशब्दं स्थापयतु',
    step3Title: 'आपणविवरणम्',
    step3Desc: 'आपणनाम लिखतु',
    step4Title: 'विपणि विवरणम्',
    step4Desc: 'विपणिस्थानं सङ्केतं च चिनोतु',

    fullNameLabel: 'पूर्णं नाम (स्वामी / व्यापारी) *',
    mobileLabel: 'चलभाषसङ्ख्या (10 अङ्काः) *',
    emailLabel: 'ईमेल-सङ्केतः (ऐच्छिकः)',
    passwordLabel: 'प्रवेशकूटशब्दं रचयतु *',
    confirmPasswordLabel: 'कूटशब्दं पुनर्विलिखतु *',
    shopNameLabel: 'आपणस्य / संस्थायाः नाम *',
    shopNumberLabel: 'आपण / स्टॉल सङ्ख्या',
    stateLabel: 'राज्यम् *',
    marketYardLabel: 'विपणिप्राङ्गणम् / मण्डीनाम *',
    shopAddressLabel: 'आपणस्य पूर्णसङ्केतः *',

    fullNamePlaceholder: 'यथा: रमेश कुमारः',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'यथा: ramesh@manditrader.com',
    passwordPlaceholder: 'कूटशब्दं स्थापयतु',
    confirmPasswordPlaceholder: 'तमेव कूटशब्दं पुनर्लिखतु',
    shopNamePlaceholder: 'यथा: श्री वेङ्कटेश्वर ट्रेडिङ्ग',
    shopNumberPlaceholder: 'यथा: स्टॉल #27, द्वारम् 3',
    marketYardPlaceholder: 'यथा: थोक विपणिप्राङ्गणम्',
    shopAddressPlaceholder: 'यथा: आपणम् #1, मण्डीप्राङ्गणम्',

    btnNext: 'अग्रे',
    btnBack: 'पृष्ठे',
    btnGetOtp: 'एकवारं प्रमाणीकरण OTP प्राप्नोतु',
    alreadyHaveAccount: 'पूर्वमेव खाता अस्ति?',
    loginLink: 'प्रविशतु (लॉगिन)',

    errFullNameRequired: 'कृपया स्वकीय पूर्णं नाम लिखतु',
    errFullNameNoNumbers: 'नामनि सङ्ख्याः न भवेयुः',
    errPhoneRequired: 'मांस्य 10-अङ्कीयां भारतीयचलभाषसङ्ख्यां लिखतु (6, 7, 8, वा 9 तः आरभ्य)',
    errPasswordMinLength: 'कूटशब्दः न्‍यूनतमम् 4 अक्षराणि भवेत्',
    errPasswordMismatch: 'कूटशब्दौ न मेलतः!',
    errShopNameRequired: 'कृपया आपणस्य नाम लिखतु',
    errMarketYardRequired: 'कृपया मण्ड्याः नाम लिखतु',
    errShopAddressRequired: 'कृपया सङ्केतं लिखतु',

    otpHeading: 'एकवारं प्रमाणीकरण OTP',
    otpSubtitle: (phone) => `+91 ${phone} इत्यत्र प्रेषितं 6-अङ्कीयं कोडं लिखतु`,
    btnVerifyOtp: 'OTP सत्यापयतु & अग्रे सरतु',
    commodityHeading: 'व्यापारयोग्याः सस्याः चिनोतु',
    commoditySubtitle: 'विपणौ विक्रययोग्यान् उत्पादान् चिनोतु',
    btnCompleteSignup: 'मण्डी पञ्जीकरणं पूर्णं करोतु',
  },
  sd: {
    merchantSignUp: 'واپاري سائن اپ',
    stepOf4: (current) => `قدم ${current} / 4`,
    heading: 'پنهنجو منڊي واپاري کاتو جوڙيو',
    subtitle: 'پنهنجي منڊي دڪان جي رجسٽريشن ڪريو',
    step1Title: 'ذاتي تفصيل',
    step1Desc: 'پورو نالو ۽ موبائل نمبر درج ڪريو',
    step2Title: 'پاسورڊ',
    step2Desc: 'لاگ ان پاسورڊ سيٽ ڪريو',
    step3Title: 'دڪان تفصيل',
    step3Desc: 'دڪان جو نالو درج ڪريو',
    step4Title: 'منڊي تفصيل',
    step4Desc: 'منڊي ۽ پتو چونڊيو',

    fullNameLabel: 'پورو نالو (مالڪ / واپاري) *',
    mobileLabel: 'موبائل نمبر (10 انگ) *',
    emailLabel: 'اي ميل پتو (اختياري)',
    passwordLabel: 'لاگ ان پاسورڊ جوڙيو *',
    confirmPasswordLabel: 'پاسورڊ جي تصديق ڪريو *',
    shopNameLabel: 'دڪان / فرم جو نالو *',
    shopNumberLabel: 'دڪان / اسٽال نمبر',
    stateLabel: 'ریاست *',
    marketYardLabel: 'مارڪيٽ يارڊ / منڊي جو نالو *',
    shopAddressLabel: 'دڪان جو مڪمل پتو *',

    fullNamePlaceholder: 'مثال: رميش ڪمار',
    mobilePlaceholder: '9849012345',
    emailPlaceholder: 'مثال: ramesh@manditrader.com',
    passwordPlaceholder: 'پاسورڊ سيٽ ڪريو',
    confirmPasswordPlaceholder: 'اهو ئي پاسورڊ ٻيهر درج ڪريو',
    shopNamePlaceholder: 'مثال: شري وينڪٽيشور ٽريڊنگ',
    shopNumberPlaceholder: 'مثال: اسٽال #27، گيٽ 3',
    marketYardPlaceholder: 'مثال: هول سيل مارڪيٽ',
    shopAddressPlaceholder: 'مثال: دڪان #1، مارڪيٽ يارڈ',

    btnNext: 'اڳتي',
    btnBack: 'پوئتي',
    btnGetOtp: 'هڪ-باري تصديقي OTP حاصل ڪريو',
    alreadyHaveAccount: 'پهرين کان کاتو آهي؟',
    loginLink: 'لاگ ان ڪريو',

    errFullNameRequired: 'مهرباني ڪري پنهنجو پورونالو درج ڪريو',
    errFullNameNoNumbers: 'نالي ۾ انگ نٿا ٿي سگهن',
    errPhoneRequired: '10 انگن جو معتبر انڊين موبائل نمبر درج ڪريو (6, 7, 8, يا 9 کان شروعات)',
    errPasswordMinLength: 'پاسورڊ گھٽ ۾ گھٽ 4 اکرن جو هجڻ گهرجي',
    errPasswordMismatch: 'پاسورڊ مچ نٿا ٿين!',
    errShopNameRequired: 'مهرباني ڪري دڪان جو نالو درج ڪريو',
    errMarketYardRequired: 'مهرباني ڪري منڊي جو نالو درج ڪريو',
    errShopAddressRequired: 'مهرباني ڪري پتو درج ڪريو',

    otpHeading: 'هڪ-باري تصديقي OTP',
    otpSubtitle: (phone) => `+91 ${phone} تي موڪليل 6 انگن جو ڪوڊ درج ڪريو`,
    btnVerifyOtp: 'OTP تصديق ڪريو & اڳتي وڌو',
    commodityHeading: 'تجارت واريون فصلون چونڊيو',
    commoditySubtitle: 'منڊي ۾ وکرو ٿيندڙ جنسون چونڊيو',
    btnCompleteSignup: 'منڊي سائن اپ مڪمل ڪريو',
  },
};

interface Props {
  onComplete: () => void;
}

export const OnboardingAuthScreen: React.FC<Props> = ({ onComplete }) => {
  const {
    language,
    setLanguage,
    setPortalMode,
    merchantProfile,
    updateMerchantProfile,
    registeredAccounts,
    registerNewAccount,
    switchUserAccount,
    verifyPasswordAndLogin,
    setUserCommodities,
    deleteRegisteredAccount,
  } = useMandi();

  // Saved Profiles list state
  const [savedProfiles, setSavedProfiles] = useState<any[]>(() => {
    const fromDevice = getSavedProfilesFromDevice();
    if (fromDevice && fromDevice.length > 0) return fromDevice;
    return registeredAccounts.map((a) => ({
      id: a.id || `USR-${a.phoneNumber}`,
      username: a.username || `trader_${a.phoneNumber.slice(-4)}`,
      fullName: a.fullName || 'Mandi Merchant',
      phoneNumber: a.phoneNumber,
      shopOrVillage: a.shopOrVillage || (a as any).shopName || '',
      photoUrl: a.photoUrl || '',
    }));
  });

  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [isManagingProfiles, setIsManagingProfiles] = useState<boolean>(false);
  const [profileToRemove, setProfileToRemove] = useState<any | null>(null);

  // Auth Mode State (default to login if saved profiles exist)
  const [authMode, setAuthMode] = useState<AuthViewMode>(() =>
    savedProfiles.length > 0 ? 'login' : 'signup'
  );

  // Login Input Fields
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPin, setLoginPin] = useState<string>('');
  const [showLoginPin, setShowLoginPin] = useState<boolean>(false);

  // Lockout state
  const [lockoutMsg, setLockoutMsg] = useState<string>('');

  // Forgot PIN state
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'new-pin'>('request');
  const [forgotPhone, setForgotPhone] = useState<string>('');
  const [forgotOtp, setForgotOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [forgotOtpResendTimer, setForgotOtpResendTimer] = useState<number>(0);
  const [forgotOtpAttempts, setForgotOtpAttempts] = useState<number>(0);

  // Sign Up Form State (5 Steps: Step 1 Mobile -> Step 2 OTP -> Step 3 Username -> Step 4 Merchant Details -> Step 5 PIN)
  const [signupStep, setSignupStep] = useState<'phone' | 'otp' | 'username' | 'merchant_details' | 'pin'>('phone');
  const [signupPhone, setSignupPhone] = useState<string>('');
  const [signupOtp, setSignupOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpResendTimer, setOtpResendTimer] = useState<number>(0);
  const [signupUsername, setSignupUsername] = useState<string>('');
  const [usernameChecking, setUsernameChecking] = useState<boolean>(false);
  const [usernameTaken, setUsernameTaken] = useState<boolean>(false);
  const [signupPin, setSignupPin] = useState<string>('');
  const [signupConfirmPin, setSignupConfirmPin] = useState<string>('');
  const [showSignupPin, setShowSignupPin] = useState<boolean>(false);

  // Merchant details for signup (Step 4)
  const [fullName, setFullName] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [shopNumber, setShopNumber] = useState<string>('');
  const [shopAddress, setShopAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('Telangana');
  const [marketYard, setMarketYard] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [selectedCommodities, setSelectedCommodities] = useState<CommodityCategory[]>(['flowers']);

  // Verification Tokens
  const [forgotSessionId, setForgotSessionId] = useState<string>('');
  const [forgotVerificationToken, setForgotVerificationToken] = useState<string>('');
  const [signupSessionId, setSignupSessionId] = useState<string>('');
  const [signupVerificationToken, setSignupVerificationToken] = useState<string>('');

  // UI status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Sync saved profiles when registeredAccounts updates
  React.useEffect(() => {
    const list = getSavedProfilesFromDevice();
    if (list.length > 0) {
      setSavedProfiles(list);
    } else if (registeredAccounts.length > 0) {
      const formatted = registeredAccounts.map((a) => ({
        id: a.id || `USR-${a.phoneNumber}`,
        username: a.username || `trader_${a.phoneNumber.slice(-4)}`,
        fullName: a.fullName || 'Mandi Merchant',
        phoneNumber: a.phoneNumber,
        shopOrVillage: a.shopOrVillage || (a as any).shopName || '',
        photoUrl: a.photoUrl || '',
      }));
      setSavedProfiles(formatted);
    }
  }, [registeredAccounts]);

  // Timer effect for Sign Up OTP resend
  React.useEffect(() => {
    if (signupStep !== 'otp' || otpResendTimer <= 0) return;
    const timer = setInterval(() => {
      setOtpResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [signupStep, otpResendTimer]);

  // Timer effect for Forgot PIN OTP resend
  React.useEffect(() => {
    if (forgotOtpResendTimer <= 0) return;
    const timer = setInterval(() => {
      setForgotOtpResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotOtpResendTimer]);

  // Profile Selection for Instagram-Style Login
  const handleSelectProfile = (profile: any) => {
    sounds.playBidTick();
    setSelectedProfile(profile);
    setLoginIdentifier(profile.username || profile.phoneNumber);
    setLoginPin('');
    setErrorMsg('');
    setLockoutMsg('');
    setSuccessMsg('');
    setTimeout(() => {
      document.getElementById('login-pin-input')?.focus();
    }, 100);
  };

  const handleLoginAnotherAccount = () => {
    sounds.playBidTick();
    setSelectedProfile(null);
    setLoginIdentifier('');
    setLoginPin('');
    setErrorMsg('');
    setLockoutMsg('');
    setSuccessMsg('');
    setTimeout(() => {
      document.getElementById('login-identifier-input')?.focus();
    }, 100);
  };

  const handleConfirmRemoveProfile = () => {
    if (!profileToRemove) return;
    const identifier = profileToRemove.id || profileToRemove.phoneNumber || profileToRemove.username;
    removeProfileFromDevice(identifier);
    if (profileToRemove.phoneNumber) {
      deleteRegisteredAccount(profileToRemove.phoneNumber);
    }
    const updated = getSavedProfilesFromDevice();
    setSavedProfiles(updated);
    if (
      selectedProfile &&
      (selectedProfile.id === profileToRemove.id ||
        selectedProfile.phoneNumber === profileToRemove.phoneNumber ||
        selectedProfile.username === profileToRemove.username)
    ) {
      setSelectedProfile(null);
      setLoginIdentifier('');
    }
    setProfileToRemove(null);
    sounds.playTrashSound?.();
  };

  // Standard Login submit with 6-digit PIN and performance timing
  const handlePinLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLockoutMsg('');

    const cleanInput = (loginIdentifier || selectedProfile?.username || selectedProfile?.phoneNumber || '').trim();
    if (!cleanInput) {
      setErrorMsg('Please enter your username or 10-digit mobile number');
      return;
    }

    if (!loginPin || loginPin.length !== 6 || !/^\d{6}$/.test(loginPin)) {
      setErrorMsg('Please enter your 6-digit numeric PIN');
      return;
    }

    const tStart = performance.now();
    console.time('[LOGIN PERF] 1. Login Button Tap -> Sign-in Request');
    setIsSubmitting(true);
    sounds.playBidTick();
    console.timeEnd('[LOGIN PERF] 1. Login Button Tap -> Sign-in Request');

    // 8-second safety timeout guard
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      setErrorMsg('Login is taking longer than expected. Please check your network and tap Retry Login.');
    }, 8000);

    console.time('[LOGIN PERF] 2. Server Sign-in Request (loginOnServer)');
    const res = await loginOnServer(cleanInput, loginPin);
    console.timeEnd('[LOGIN PERF] 2. Server Sign-in Request (loginOnServer)');

    clearTimeout(timeoutId);

    if (!res.success) {
      setIsSubmitting(false);
      sounds.playTrashSound?.();
      if (res.isLocked) {
        setLockoutMsg(res.error || 'Login locked due to 5 incorrect PIN attempts.');
      } else {
        setErrorMsg(res.error || 'Wrong PIN');
      }
      return;
    }

    console.time('[LOGIN PERF] 3. Profile & Data Fetch (Local Memory)');
    sounds.playCashChime();
    const verifiedPhone = res.account?.phoneNumber || cleanInput;
    const cleanPhone = verifiedPhone.replace(/\D/g, '').slice(-10);

    switchUserAccount(cleanPhone);
    setPortalMode(cleanPhone.endsWith('9110387978') ? 'admin' : res.account?.role || 'merchant');

    if (res.account?.selectedCommodities && res.account.selectedCommodities.length > 0) {
      setUserCommodities(res.account.selectedCommodities);
    }

    try {
      localStorage.setItem('bharatmandi_onboarding_completed', 'true');
      localStorage.setItem('bharatmandi_user_role', res.account?.role || 'merchant');
      localStorage.setItem('bharatmandi_active_phone_v1', cleanPhone);
    } catch {}
    console.timeEnd('[LOGIN PERF] 3. Profile & Data Fetch (Local Memory)');

    console.time('[LOGIN PERF] 4. First Screen Rendered (Dashboard)');
    setIsSubmitting(false);
    onComplete();
    console.timeEnd('[LOGIN PERF] 4. First Screen Rendered (Dashboard)');

    const tEnd = performance.now();
    console.log(`[LOGIN PERF SUMMARY] Full login completed in ${(tEnd - tStart).toFixed(2)} ms`);
  };

  // ==========================================
  // SIGN UP FLOW HANDLERS (5 STEPS)
  // ==========================================

  // Step 1: Send OTP to 10-digit Mobile
  const handleSignupSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const phoneVal = validateIndianMobile(signupPhone);
    if (!phoneVal.isValid) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)');
      return;
    }

    const cleanPhone = phoneVal.cleanNumber || cleanIndianMobile(signupPhone);

    setIsSubmitting(true);
    sounds.playBidTick();

    try {
      const res = await sendOtpOnServer(cleanPhone, 'signup');
      if (!res.success) {
        setErrorMsg(res.error || 'Could not send OTP. Please try again.');
        return;
      }

      setSignupSessionId(res.sessionId || '');
      setOtpResendTimer(30);
      setSignupOtp(['', '', '', '', '', '']);

      // Check if phone already exists
      const serverCheck = await checkUserOnServer(cleanPhone);
      if (serverCheck && (serverCheck.exists || serverCheck.hasPassword)) {
        setSuccessMsg(`Mobile +91 ${cleanPhone} is registered. Enter OTP to log in immediately.`);
      }

      setSignupStep('otp');
      sounds.playCashChime();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while sending OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleSignupVerifyOtp = async () => {
    const entered = signupOtp.join('');
    if (entered.length < 4) {
      setErrorMsg('Please enter your verification OTP code');
      return;
    }

    const cleanPhone = cleanIndianMobile(signupPhone);

    setIsSubmitting(true);
    try {
      const verifyRes = await verifyOtpOnServer(cleanPhone, signupSessionId, entered);
      if (!verifyRes.success) {
        setErrorMsg(verifyRes.error || 'Invalid OTP code. Please check and try again.');
        return;
      }

      setSignupVerificationToken(verifyRes.verificationToken || '');

    // Check if user is already registered (skip sign up and log in)
    const serverCheck = await checkUserOnServer(cleanPhone);
    if (serverCheck && (serverCheck.exists || serverCheck.hasPassword)) {
      sounds.playCashChime();
      switchUserAccount(cleanPhone);
      setPortalMode('merchant');
      try {
        localStorage.setItem('bharatmandi_onboarding_completed', 'true');
        localStorage.setItem('bharatmandi_active_phone_v1', cleanPhone);
      } catch {}
      onComplete();
      return;
    }

      setErrorMsg('');
      setSignupStep('username');
      sounds.playCashChime();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error verifying OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Validate Username (with 5-Second Timeout & Error Re-enable)
  const handleUsernameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signupUsername || !isValidUsername(signupUsername)) {
      setErrorMsg('Username must be 3 to 20 characters long (letters, numbers, _ and . allowed)');
      return;
    }

    setUsernameChecking(true);
    try {
      const check = await checkUsernameOnServer(signupUsername);
      setUsernameChecking(false);

      if (!check.success && check.error) {
        setErrorMsg(check.error || 'Could not check username, try again');
        setUsernameTaken(false);
        return;
      }

      if (!check.available) {
        setUsernameTaken(true);
        setErrorMsg('Username taken');
        return;
      }

      setUsernameTaken(false);
      setSuccessMsg('Username available');
      sounds.playBidTick();

      setTimeout(() => {
        setSuccessMsg('');
        setSignupStep('merchant_details');
      }, 400);
    } catch (err: any) {
      setUsernameChecking(false);
      setErrorMsg('Could not check username, try again');
    }
  };

  // Step 4: Merchant Profile Details Submit
  const handleMerchantDetailsSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter Owner / Trader Name');
      return;
    }
    if (!shopName.trim()) {
      setErrorMsg('Please enter Shop / Firm Name');
      return;
    }
    if (!marketYard.trim()) {
      setErrorMsg('Please enter Market or Mandi Name');
      return;
    }

    setSignupStep('pin');
    sounds.playBidTick();
  };

  // Step 5: Complete Sign Up with 6-Digit PIN
  const handlePinAndCompleteSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signupPin || signupPin.length !== 6 || !/^\d{6}$/.test(signupPin)) {
      setErrorMsg('Please enter a 6-digit numeric PIN');
      return;
    }

    if (signupPin !== signupConfirmPin) {
      setErrorMsg('PINs do not match');
      return;
    }

    if (isWeakPin(signupPin)) {
      setErrorMsg('This PIN is too simple (e.g. 000000, 111111, 123456). Please set a unique 6-digit PIN.');
      return;
    }

    const cleanPhone = cleanIndianMobile(signupPhone);

    setIsSubmitting(true);
    sounds.playBidTick();

    try {
      const regResult = await registerPasswordOnServer({
        phone: cleanPhone,
        username: signupUsername,
        password: signupPin,
        confirmPassword: signupConfirmPin,
        verificationToken: signupVerificationToken,
        fullName,
        shopOrVillage: shopName,
        shopAddress: city ? `${city}, ${selectedState}` : `${marketYard}, ${selectedState}`,
        shopNumber: shopNumber || 'Shop 1',
        marketName: marketYard,
        licenseOrCrop: licenseNumber || 'Verified Merchant',
        selectedCommodities,
        role: 'merchant',
      });

      setIsSubmitting(false);

      if (!regResult.success) {
        setErrorMsg(regResult.error || 'Registration failed. Please try again.');
        return;
      }

      updateMerchantProfile({
        shopName,
        ownerName: fullName,
        shopNumber: shopNumber || 'Shop 1',
        marketYardName: marketYard,
        address: city ? `${city}, ${selectedState}` : `${marketYard}, ${selectedState}`,
        phoneNumber: cleanPhone,
        licenseNumber: licenseNumber || '',
      });

      setUserCommodities(selectedCommodities);
      switchUserAccount(cleanPhone);
      setPortalMode(cleanPhone.endsWith('9110387978') ? 'admin' : 'merchant');

      try {
        localStorage.setItem('bharatmandi_onboarding_completed', 'true');
        localStorage.setItem('bharatmandi_user_role', 'merchant');
        localStorage.setItem('bharatmandi_active_phone_v1', cleanPhone);
        localStorage.setItem('bharatmandi_user_commodities', JSON.stringify(selectedCommodities));
      } catch {}

      sounds.playGavelStrike();
      onComplete();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Could not complete registration. Please try again.');
    }
  };

  // ==========================================
  // FORGOT PIN FLOW HANDLERS
  // ==========================================
  const handleForgotRequestOtp = async () => {
    setErrorMsg('');
    const cleanPhone = cleanIndianMobile(forgotPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit registered mobile number');
      return;
    }

    setIsSubmitting(true);
    const res = await sendOtpOnServer(cleanPhone, 'forgot-password');
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Could not send OTP code.');
      return;
    }

    setForgotSessionId(res.sessionId || '');
    setForgotOtpResendTimer(30);
    setForgotOtpAttempts(0);
    setForgotOtp(['', '', '', '', '', '']);

    setForgotStep('otp');
    sounds.playBidTick();
  };

  const handleForgotVerifyOtp = async () => {
    const code = forgotOtp.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter the full 6-digit OTP code');
      return;
    }

    const cleanPhone = cleanIndianMobile(forgotPhone);

    setIsSubmitting(true);
    const verifyRes = await verifyOtpOnServer(cleanPhone, forgotSessionId, code);
    setIsSubmitting(false);

    if (!verifyRes.success) {
      const newAttempts = forgotOtpAttempts + 1;
      setForgotOtpAttempts(newAttempts);
      setErrorMsg(verifyRes.error || `Invalid OTP code. Attempts remaining: ${Math.max(0, 3 - newAttempts)}`);
      return;
    }

    setForgotVerificationToken(verifyRes.verificationToken || '');
    setErrorMsg('');
    setForgotStep('new-pin');
    sounds.playCashChime();
  };

  const handleForgotResetSubmit = async () => {
    setErrorMsg('');
    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setErrorMsg('PIN must be exactly 6 numeric digits');
      return;
    }
    if (newPin !== confirmNewPin) {
      setErrorMsg('PINs do not match!');
      return;
    }
    if (isWeakPin(newPin)) {
      setErrorMsg('This PIN is too weak/simple. Please choose a stronger 6-digit PIN.');
      return;
    }

    const cleanPhone = cleanIndianMobile(forgotPhone);

    setIsSubmitting(true);
    const res = await resetPasswordOnServer({
      phone: cleanPhone,
      newPassword: newPin,
      confirmNewPassword: confirmNewPin,
      verificationToken: forgotVerificationToken,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to reset PIN');
      return;
    }

    sounds.playGavelStrike();
    setSuccessMsg('6-Digit Security PIN reset successfully! Switched to Log In.');

    setAuthMode('login');
    setLoginIdentifier(cleanPhone);
    setLoginPin('');
    setForgotStep('request');
    setForgotPhone('');
    setNewPin('');
    setConfirmNewPin('');
    setLockoutMsg('');
  };

  const signupTrans = SIGNUP_TRANSLATIONS[language] || SIGNUP_TRANSLATIONS.en;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col justify-between font-sans relative p-3 sm:p-6 md:p-8">
      {/* Header Bar */}
      <header className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <img
            src="/bharat_mandi_logo.png"
            alt="Bharat Mandi Logo"
            referrerPolicy="no-referrer"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 bg-transparent"
          />
          <div>
            <h1 className="font-black text-lg sm:text-xl text-[#1a3a52] tracking-tight">
              भारत MANDI • Merchant Ledger
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Multi-Commodity Wholesale Mandi Settlement System
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto my-auto py-4 space-y-4">
        {/* Lockout Warning Banner */}
        {lockoutMsg && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold space-y-2 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-extrabold">{lockoutMsg}</span>
            </div>
            <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
              <span className="text-amber-800 text-[11px]">Forgot 6-digit PIN? Verify by mobile OTP:</span>
              <button
                type="button"
                onClick={() => {
                  sounds.playBidTick();
                  setAuthMode('forgot-password');
                  setForgotStep('request');
                  setForgotPhone(loginIdentifier);
                  setErrorMsg('');
                  setLockoutMsg('');
                }}
                className="px-2.5 py-1 bg-[#1a3a52] text-white rounded-lg text-xs font-black hover:bg-[#122839] transition cursor-pointer"
              >
                Reset PIN
              </button>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-bold space-y-2 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-xs font-extrabold">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* =========================================================================
            MODE 1: LOG IN (Instagram Style: Saved Profile Cards + 6-Digit PIN)
           ========================================================================= */}
        {authMode === 'login' && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block text-[#1a3a52] bg-[#eef3f7]">
                Merchant Sign In
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#1e293b]">
                Log In to Your Mandi Ledger
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Enter username/mobile and 6-digit PIN
              </p>
            </div>

            {/* INSTAGRAM-STYLE SAVED PROFILES SECTION */}
            {savedProfiles.length > 0 && (
              <div className="bg-[#f8fafc] rounded-2xl border-2 border-[#d4af37]/40 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#d4af37]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#1a3a52]">
                      Saved Accounts on this Device
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsManagingProfiles(!isManagingProfiles)}
                    className="text-xs font-bold text-[#1a3a52] hover:underline cursor-pointer"
                  >
                    {isManagingProfiles ? 'Done Managing' : 'Manage Profiles'}
                  </button>
                </div>

                <div className="space-y-2">
                  {savedProfiles.map((prof) => {
                    const isSelected =
                      selectedProfile &&
                      (selectedProfile.id === prof.id ||
                        selectedProfile.phoneNumber === prof.phoneNumber ||
                        selectedProfile.username === prof.username);

                    return (
                      <div
                        key={prof.id || prof.phoneNumber}
                        className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition shadow-2xs ${
                          isSelected
                            ? 'bg-amber-50/60 border-[#1a3a52] ring-2 ring-[#1a3a52]/20'
                            : 'bg-white border-slate-200 hover:border-[#1a3a52]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectProfile(prof)}
                          className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#1a3a52] text-[#d4af37] flex items-center justify-center shrink-0 font-black text-sm">
                            {prof.fullName ? prof.fullName[0].toUpperCase() : 'M'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-sm text-[#1e293b] truncate">
                              {prof.fullName || 'Mandi Merchant'}
                            </p>
                            <p className="text-xs text-slate-500 truncate font-mono">
                              @{prof.username || `trader_${prof.phoneNumber?.slice(-4)}`} • +91 {prof.phoneNumber}
                            </p>
                          </div>
                        </button>

                        {isManagingProfiles ? (
                          <button
                            type="button"
                            onClick={() => setProfileToRemove(prof)}
                            title="Remove profile from this device"
                            className="p-2 text-red-500 hover:text-red-700 rounded-xl transition cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectProfile(prof)}
                            className="px-3.5 py-1.5 text-xs font-black rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white transition flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <span>Select</span>
                            <ArrowRight className="w-3 h-3 text-[#d4af37]" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedProfile && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleLoginAnotherAccount}
                      className="text-xs font-bold text-slate-500 hover:text-[#1a3a52] cursor-pointer"
                    >
                      ← Log in with another account
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* LOGIN FORM WITH 6-DIGIT PIN */}
            <form onSubmit={handlePinLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-identifier-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                  Username or Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    id="login-identifier-input"
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter username or 10-digit mobile"
                    disabled={Boolean(selectedProfile)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-semibold text-sm text-[#1e293b] outline-none disabled:bg-slate-100 disabled:text-slate-600"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-pin-input" className="text-xs font-black uppercase tracking-wider text-[#1a3a52]">
                    6-Digit Security PIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playBidTick();
                      setAuthMode('forgot-password');
                      setForgotStep('request');
                      setForgotPhone(loginIdentifier.replace(/\D/g, '').slice(-10));
                      setErrorMsg('');
                      setLockoutMsg('');
                    }}
                    className="text-xs font-bold text-[#1a3a52] hover:underline cursor-pointer"
                  >
                    Forgot PIN?
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    id="login-pin-input"
                    type={showLoginPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit PIN"
                    className="w-full pl-11 pr-11 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-base text-[#1e293b] outline-none tracking-widest"
                    required
                    autoFocus={Boolean(selectedProfile)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPin(!showLoginPin)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* On-Screen Touch Numeric Keypad for Smooth Touchscreen PIN Entry */}
              <div className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-[#1a3a52] uppercase tracking-wider text-center">
                  Touch Numeric Keypad
                </p>
                <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => {
                        sounds.playBidTick();
                        if (btn === 'C') {
                          setLoginPin('');
                        } else if (btn === '⌫') {
                          setLoginPin((prev) => prev.slice(0, -1));
                        } else if (loginPin.length < 6) {
                          setLoginPin((prev) => prev + btn);
                        }
                      }}
                      className="py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-[#1a3a52] hover:text-white font-mono font-black text-base transition text-[#1e293b] cursor-pointer shadow-2xs active:scale-95"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-[#d4af37]" />
                  </>
                )}
              </button>

              <div className="text-center pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 font-medium">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    id="switch-to-signup-btn"
                    onClick={() => {
                      sounds.playBidTick();
                      setAuthMode('signup');
                      setSignupStep('phone');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-black text-[#1a3a52] hover:underline cursor-pointer ml-1"
                  >
                    Sign Up New Merchant
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            MODE 2: FORGOT PIN FLOW
           ========================================================================= */}
        {authMode === 'forgot-password' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#d4af37]" />
                <h2 className="text-xl font-black text-[#1e293b]">Reset 6-Digit Security PIN</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg('');
                }}
                className="text-xs font-bold text-slate-500 hover:text-[#1a3a52] cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>

            {forgotStep === 'request' && (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Enter your registered 10-digit mobile number. We will send a 6-digit OTP code to verify your identity.
                </p>

                <div>
                  <label htmlFor="forgot-phone-input" className="block text-xs font-black uppercase text-[#1a3a52] mb-1">
                    Registered Mobile Number (10 Digits) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 font-bold text-slate-500 text-sm">🇮🇳 +91</span>
                    <input
                      id="forgot-phone-input"
                      type="tel"
                      maxLength={10}
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9849012345"
                      className="w-full pl-20 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-sm text-[#1e293b] outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-forgot-send-otp"
                  onClick={handleForgotRequestOtp}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-sm transition shadow-md cursor-pointer"
                >
                  Send Verification OTP Code
                </button>
              </div>
            )}

            {forgotStep === 'otp' && (
              <div className="space-y-4 text-center">
                <p className="text-xs sm:text-sm text-slate-600">
                  Enter the 6-digit code sent to <strong>+91 {forgotPhone}</strong>:
                </p>

                <div className="flex justify-center gap-1.5 sm:gap-2 my-2">
                  {forgotOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`forgot-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const newOtp = [...forgotOtp];
                        newOtp[idx] = val;
                        setForgotOtp(newOtp);
                        if (val && idx < 5) {
                          document.getElementById(`forgot-otp-${idx + 1}`)?.focus();
                        }
                      }}
                      className="w-10 sm:w-12 h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-black border-2 border-slate-300 focus:border-[#1a3a52] rounded-xl outline-none shadow-xs"
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleForgotRequestOtp}
                    disabled={forgotOtpResendTimer > 0 || isSubmitting}
                    className="w-1/2 py-3 px-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotOtpResendTimer > 0 ? `Resend in ${forgotOtpResendTimer}s` : 'Resend OTP'}
                  </button>

                  <button
                    type="button"
                    id="btn-forgot-verify-otp"
                    onClick={handleForgotVerifyOtp}
                    disabled={isSubmitting}
                    className="w-1/2 py-3 px-3 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-xs transition shadow-md cursor-pointer"
                  >
                    Verify OTP Code
                  </button>
                </div>
              </div>
            )}

            {forgotStep === 'new-pin' && (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600">
                  Enter your new 6-digit numeric PIN:
                </p>

                <div>
                  <label htmlFor="new-pin-input" className="block text-xs font-black uppercase text-[#1a3a52] mb-1">
                    New 6-Digit PIN *
                  </label>
                  <input
                    id="new-pin-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter new 6-digit PIN"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-[#1e293b] outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-new-pin-input" className="block text-xs font-black uppercase text-[#1a3a52] mb-1">
                    Confirm New 6-Digit PIN *
                  </label>
                  <input
                    id="confirm-new-pin-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Re-enter new 6-digit PIN"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-[#1e293b] outline-none"
                  />
                </div>

                <button
                  type="button"
                  id="btn-forgot-save-pin"
                  onClick={handleForgotResetSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  Save New PIN &amp; Go to Login
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODE 3: SIGN UP (Exact 5-Step Order with Progress Bar & Back Nav)
            Step 1: Mobile Number -> Step 2: OTP -> Step 3: Username -> Step 4: Merchant Details -> Step 5: PIN
           ========================================================================= */}
        {authMode === 'signup' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-md space-y-5 max-w-lg mx-auto">
            
            {/* Progress Bar & Back Navigation Header */}
            <div className="space-y-3 pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBidTick();
                    setErrorMsg('');
                    setSuccessMsg('');
                    if (signupStep === 'phone') setAuthMode('login');
                    else if (signupStep === 'otp') setSignupStep('phone');
                    else if (signupStep === 'username') setSignupStep('otp');
                    else if (signupStep === 'merchant_details') setSignupStep('username');
                    else if (signupStep === 'pin') setSignupStep('merchant_details');
                  }}
                  className="flex items-center gap-1.5 text-xs font-black text-[#1a3a52] hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Back</span>
                </button>

                <span className="text-xs font-black text-[#1a3a52] uppercase tracking-wider bg-[#eef3f7] px-3 py-1 rounded-full font-mono">
                  {signupStep === 'phone' && 'Step 1 of 5'}
                  {signupStep === 'otp' && 'Step 2 of 5'}
                  {signupStep === 'username' && 'Step 3 of 5'}
                  {signupStep === 'merchant_details' && 'Step 4 of 5'}
                  {signupStep === 'pin' && 'Step 5 of 5'}
                </span>
              </div>

              {/* Visual Progress Line */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-[#1a3a52] h-full transition-all duration-300 rounded-full"
                  style={{
                    width:
                      signupStep === 'phone' ? '20%' :
                      signupStep === 'otp' ? '40%' :
                      signupStep === 'username' ? '60%' :
                      signupStep === 'merchant_details' ? '80%' :
                      '100%',
                  }}
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-[#1e293b]">
                {signupStep === 'phone' && 'Step 1: Enter Mobile Number'}
                {signupStep === 'otp' && 'Step 2: Verification OTP'}
                {signupStep === 'username' && 'Step 3: Choose Username'}
                {signupStep === 'merchant_details' && 'Step 4: Merchant Profile Details'}
                {signupStep === 'pin' && 'Step 5: Set 6-Digit Security PIN'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {signupStep === 'phone' && 'Enter a 10-digit Indian mobile number to receive OTP'}
                {signupStep === 'otp' && `Enter the 6-digit code sent to +91 ${signupPhone}`}
                {signupStep === 'username' && 'Choose a unique handle (3–20 characters)'}
                {signupStep === 'merchant_details' && 'Provide your trader, firm, mandi, and produce details'}
                {signupStep === 'pin' && 'Create your secret 6-digit PIN for device login'}
              </p>
            </div>

            {/* STEP 1: MOBILE NUMBER */}
            {signupStep === 'phone' && (
              <form onSubmit={handleSignupSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="signup-phone-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 font-bold text-slate-500 text-sm">🇮🇳 +91</span>
                    <input
                      id="signup-phone-input"
                      type="tel"
                      maxLength={10}
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9849012345"
                      className="w-full pl-20 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-sm text-[#1e293b] outline-none"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-signup-send-otp"
                  disabled={isSubmitting || signupPhone.length < 10}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <ArrowRight className="w-4 h-4 text-[#d4af37]" />
                    </>
                  )}
                </button>

                <div className="text-center pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playBidTick();
                        setAuthMode('login');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="font-black text-[#1a3a52] hover:underline cursor-pointer ml-1"
                    >
                      Log In
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {signupStep === 'otp' && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center gap-1.5 sm:gap-2 my-2">
                  {signupOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`signup-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const newOtp = [...signupOtp];
                        newOtp[idx] = val;
                        setSignupOtp(newOtp);
                        if (val && idx < 5) {
                          document.getElementById(`signup-otp-${idx + 1}`)?.focus();
                        }
                      }}
                      className="w-10 sm:w-12 h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-black border-2 border-slate-300 focus:border-[#1a3a52] rounded-xl outline-none shadow-xs"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => handleSignupSendOtp()}
                    disabled={otpResendTimer > 0 || isSubmitting}
                    className={`text-xs font-black cursor-pointer ${
                      otpResendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#1a3a52] hover:underline'
                    }`}
                  >
                    {otpResendTimer > 0 ? `Resend OTP in ${otpResendTimer}s` : 'Resend OTP'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupStep('phone')}
                    className="text-xs font-bold text-slate-500 hover:text-[#1a3a52] cursor-pointer"
                  >
                    Change Phone
                  </button>
                </div>

                <button
                  type="button"
                  id="btn-signup-verify-otp"
                  onClick={handleSignupVerifyOtp}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP &amp; Continue</span>
                      <ArrowRight className="w-4 h-4 text-[#d4af37]" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 3: USERNAME SELECTION */}
            {signupStep === 'username' && (
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div>
                  <label htmlFor="signup-username-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                    Choose Unique Username *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold">@</span>
                    <input
                      id="signup-username-input"
                      type="text"
                      value={signupUsername}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
                        setSignupUsername(val);
                        setUsernameTaken(false);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      placeholder="e.g. ramesh_trader"
                      className={`w-full pl-9 pr-4 py-3 rounded-xl border-2 font-mono font-bold text-sm text-[#1e293b] outline-none ${
                        usernameTaken ? 'border-red-400 bg-red-50/30' : 'border-slate-200 focus:border-[#1a3a52]'
                      }`}
                      autoFocus
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    3 to 20 characters (letters, numbers, underscore _, and dot . allowed)
                  </p>
                </div>

                <button
                  type="submit"
                  id="btn-signup-username-next"
                  disabled={usernameChecking}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{usernameChecking ? 'Checking Username...' : 'Check Username & Continue'}</span>
                  <ArrowRight className="w-4 h-4 text-[#d4af37]" />
                </button>
              </form>
            )}

            {/* STEP 4: MERCHANT DETAILS */}
            {signupStep === 'merchant_details' && (
              <form onSubmit={handleMerchantDetailsSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="signup-fullname-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                    Owner / Trader Name *
                  </label>
                  <input
                    id="signup-fullname-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.replace(/[0-9]/g, ''))}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-semibold text-sm text-[#1e293b] outline-none"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-shopname-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                      Shop / Firm Name *
                    </label>
                    <input
                      id="signup-shopname-input"
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Sri Venkateswara Trading"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-semibold text-sm text-[#1e293b] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-marketyard-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                      Market or Mandi Name *
                    </label>
                    <input
                      id="signup-marketyard-input"
                      type="text"
                      value={marketYard}
                      onChange={(e) => setMarketYard(e.target.value)}
                      placeholder="e.g. Ghazipur Mandi"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-semibold text-sm text-[#1e293b] outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-city-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                      City *
                    </label>
                    <input
                      id="signup-city-input"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Hyderabad"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-semibold text-sm text-[#1e293b] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-state-select" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                      State *
                    </label>
                    <select
                      id="signup-state-select"
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-semibold text-sm text-[#1e293b] outline-none bg-white"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Main Commodity Choice */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                    Main Commodity Produce *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_COMMODITIES.map((catKey) => {
                      const cfg = COMMODITY_CONFIGS[catKey];
                      if (!cfg) return null;
                      const isSelected = selectedCommodities.includes(catKey);

                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => {
                            sounds.playBidTick();
                            if (selectedCommodities.includes(catKey)) {
                              if (selectedCommodities.length > 1) {
                                setSelectedCommodities(selectedCommodities.filter((c) => c !== catKey));
                              }
                            } else {
                              setSelectedCommodities([...selectedCommodities, catKey]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border-2 text-left transition flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#1a3a52] text-white border-[#1a3a52] shadow-xs'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xl shrink-0">{cfg.icon}</span>
                          <span className="font-bold text-xs truncate">{cfg.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-license-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                    Market License Number (Optional)
                  </label>
                  <input
                    id="signup-license-input"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. LIC-MND-9842"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-semibold text-sm text-[#1e293b] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-signup-merchant-details-next"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-black text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Continue to Set 6-Digit PIN</span>
                  <ArrowRight className="w-4 h-4 text-[#d4af37]" />
                </button>
              </form>
            )}

            {/* STEP 5: SET 6-DIGIT PIN */}
            {signupStep === 'pin' && (
              <form onSubmit={handlePinAndCompleteSubmit} className="space-y-4">
                <div>
                  <label htmlFor="signup-pin-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                    Set 6-Digit Security PIN *
                  </label>
                  <div className="relative">
                    <input
                      id="signup-pin-input"
                      type={showSignupPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={6}
                      value={signupPin}
                      onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit numeric PIN"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-base text-[#1e293b] outline-none tracking-widest"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPin(!showSignupPin)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showSignupPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-confirmpin-input" className="block text-xs font-black uppercase tracking-wider text-[#1a3a52] mb-1">
                    Confirm 6-Digit Security PIN *
                  </label>
                  <input
                    id="signup-confirmpin-input"
                    type={showSignupPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={signupConfirmPin}
                    onChange={(e) => setSignupConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Re-enter 6-digit numeric PIN"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a3a52] font-mono font-bold text-base text-[#1e293b] outline-none tracking-widest"
                    required
                  />
                </div>

                {/* Touch Numeric Keypad */}
                <div className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-200 space-y-2">
                  <p className="text-[11px] font-bold text-[#1a3a52] uppercase tracking-wider text-center">
                    Numeric Keypad
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => {
                          sounds.playBidTick();
                          if (btn === 'C') {
                            setSignupPin('');
                            setSignupConfirmPin('');
                          } else if (btn === '⌫') {
                            if (signupConfirmPin.length > 0) {
                              setSignupConfirmPin((prev) => prev.slice(0, -1));
                            } else {
                              setSignupPin((prev) => prev.slice(0, -1));
                            }
                          } else {
                            if (signupPin.length < 6) {
                              setSignupPin((prev) => prev + btn);
                            } else if (signupConfirmPin.length < 6) {
                              setSignupConfirmPin((prev) => prev + btn);
                            }
                          }
                        }}
                        className="py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-[#1a3a52] hover:text-white font-mono font-black text-base transition text-[#1e293b] cursor-pointer shadow-2xs active:scale-95"
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-signup-complete-enter"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  <span>Create Account &amp; Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Profile Removal Confirmation Modal */}
      {profileToRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-center border-2 border-slate-200 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1e293b]">Remove Profile?</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Remove this profile from this device?
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 italic">
                (This only removes the saved card from this device, not your account)
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProfileToRemove(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveProfile}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center pt-4 border-t border-slate-200 text-xs text-slate-500">
        <p className="font-medium">
          भारत MANDI Wholesale Form C Settlement System • Cloud Sync Active
        </p>
      </footer>
    </div>
  );
};
