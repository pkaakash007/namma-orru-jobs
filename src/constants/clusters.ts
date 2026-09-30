/**
 * Official 38 Districts of Tamil Nadu
 * Used for location autocomplete and search filtering across jobs.
 */

export interface DistrictInfo {
  id: string
  nameEn: string
  nameTa: string
  nameHi: string
  isIndustrialTier2: boolean
}

export const ALL_38_TN_DISTRICTS: DistrictInfo[] = [
  { id: 'coimbatore', nameEn: 'Coimbatore', nameTa: 'கோயம்புத்தூர்', nameHi: 'कोयंबटूर', isIndustrialTier2: true },
  { id: 'tiruppur', nameEn: 'Tiruppur', nameTa: 'திருப்பூர்', nameHi: 'तिरुपुर', isIndustrialTier2: true },
  { id: 'erode', nameEn: 'Erode', nameTa: 'ஈரோடு', nameHi: 'इरोड', isIndustrialTier2: true },
  { id: 'salem', nameEn: 'Salem', nameTa: 'சேலம்', nameHi: 'सेलम', isIndustrialTier2: true },
  { id: 'namakkal', nameEn: 'Namakkal', nameTa: 'நாமக்கல்', nameHi: 'नमक्कल', isIndustrialTier2: true },
  { id: 'karur', nameEn: 'Karur', nameTa: 'கரூர்', nameHi: 'करूर', isIndustrialTier2: true },
  { id: 'chennai', nameEn: 'Chennai', nameTa: 'சென்னை', nameHi: 'चेन्नई', isIndustrialTier2: true },
  { id: 'madurai', nameEn: 'Madurai', nameTa: 'மதுரை', nameHi: 'मदुरै', isIndustrialTier2: true },
  { id: 'trichy', nameEn: 'Tiruchirappalli (Trichy)', nameTa: 'திருச்சிராப்பள்ளி', nameHi: 'तिरुचिरापल्ली', isIndustrialTier2: true },
  { id: 'tuticorin', nameEn: 'Thoothukudi (Tuticorin)', nameTa: 'தூத்துக்குடி', nameHi: 'थूथुकुडी', isIndustrialTier2: true },
  { id: 'dindigul', nameEn: 'Dindigul', nameTa: 'திண்டுக்கல்', nameHi: 'डिंडीगुल', isIndustrialTier2: false },
  { id: 'thanjavur', nameEn: 'Thanjavur', nameTa: 'தஞ்சாவூர்', nameHi: 'तंजावुर', isIndustrialTier2: false },
  { id: 'tirunelveli', nameEn: 'Tirunelveli', nameTa: 'திருநெல்வேலி', nameHi: 'तिरुनेलवेली', isIndustrialTier2: false },
  { id: 'vellore', nameEn: 'Vellore', nameTa: 'வேலூர்', nameHi: 'वेल्लोर', isIndustrialTier2: false },
  { id: 'kanchipuram', nameEn: 'Kanchipuram', nameTa: 'காஞ்சிபுரம்', nameHi: 'कांचीपुरम', isIndustrialTier2: false },
  { id: 'chengalpattu', nameEn: 'Chengalpattu', nameTa: 'செங்கல்பட்டு', nameHi: 'चेंगलपट्टू', isIndustrialTier2: false },
  { id: 'krishnagiri', nameEn: 'Krishnagiri (Hosur)', nameTa: 'கிருஷ்ணகிரி (ஓசூர்)', nameHi: 'कृष्णगिरि (होसुर)', isIndustrialTier2: true },
  { id: 'dharmapuri', nameEn: 'Dharmapuri', nameTa: 'தருமபுரி', nameHi: 'धर्मपुरी', isIndustrialTier2: false },
  { id: 'villupuram', nameEn: 'Villupuram', nameTa: 'விழுப்புரம்', nameHi: 'विलुप्पुरम', isIndustrialTier2: false },
  { id: 'cuddalore', nameEn: 'Cuddalore', nameTa: 'கடலூர்', nameHi: 'कुड्डालोर', isIndustrialTier2: false },
  { id: 'ranipet', nameEn: 'Ranipet', nameTa: 'ராணிப்பேட்டை', nameHi: 'रानीपेट', isIndustrialTier2: false },
  { id: 'tirupathur', nameEn: 'Tirupathur', nameTa: 'திருப்பத்தூர்', nameHi: 'तिरुपात्तूर', isIndustrialTier2: false },
  { id: 'tiruvannamalai', nameEn: 'Tiruvannamalai', nameTa: 'திருவண்ணாமலை', nameHi: 'तिरुवन्नामलाई', isIndustrialTier2: false },
  { id: 'kallakurichi', nameEn: 'Kallakurichi', nameTa: 'கள்ளக்குறிச்சி', nameHi: 'कल्लाकुरिची', isIndustrialTier2: false },
  { id: 'nagapattinam', nameEn: 'Nagapattinam', nameTa: 'நாகப்பட்டினம்', nameHi: 'नागापट्टिनम', isIndustrialTier2: false },
  { id: 'mayiladuthurai', nameEn: 'Mayiladuthurai', nameTa: 'மயிலாடுதுறை', nameHi: 'मयिलादुथुराई', isIndustrialTier2: false },
  { id: 'tiruvarur', nameEn: 'Tiruvarur', nameTa: 'திருவாரூர்', nameHi: 'तिरुवारूर', isIndustrialTier2: false },
  { id: 'pudukkottai', nameEn: 'Pudukkottai', nameTa: 'புதுக்கோட்டை', nameHi: 'पुदुक्कोट्टई', isIndustrialTier2: false },
  { id: 'sivaganga', nameEn: 'Sivaganga', nameTa: 'சிவகங்கை', nameHi: 'शिवगंगा', isIndustrialTier2: false },
  { id: 'ramanathapuram', nameEn: 'Ramanathapuram', nameTa: 'ராமநாதபுரம்', nameHi: 'रामनाथपुरम', isIndustrialTier2: false },
  { id: 'virudhunagar', nameEn: 'Virudhunagar (Sivakasi)', nameTa: 'விருதுநகர் (சிவகாசி)', nameHi: 'विरुधुनगर (शिवकाशी)', isIndustrialTier2: true },
  { id: 'theni', nameEn: 'Theni', nameTa: 'தேனி', nameHi: 'थेनी', isIndustrialTier2: false },
  { id: 'tenkasi', nameEn: 'Tenkasi', nameTa: 'தென்காசி', nameHi: 'तेनकासी', isIndustrialTier2: false },
  { id: 'kanyakumari', nameEn: 'Kanyakumari', nameTa: 'கன்னியாகுமரி', nameHi: 'कन्याकुमारी', isIndustrialTier2: false },
  { id: 'nilgiris', nameEn: 'The Nilgiris (Ooty)', nameTa: 'நீலகிரி', nameHi: 'नीलगिरि', isIndustrialTier2: false },
  { id: 'perambalur', nameEn: 'Perambalur', nameTa: 'பெரம்பலூர்', nameHi: 'पेराम्बलूर', isIndustrialTier2: false },
  { id: 'ariyalur', nameEn: 'Ariyalur', nameTa: 'அரியலூர்', nameHi: 'அரியாலாம்', isIndustrialTier2: false },
  { id: 'tiruvallur', nameEn: 'Tiruvallur', nameTa: 'திருவள்ளூர்', nameHi: 'तिरुवल्लूर', isIndustrialTier2: false },
]
