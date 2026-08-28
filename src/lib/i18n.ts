import { useState, useEffect } from 'react';

type Language = 'en' | 'ti';

const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    'greeting': 'Good morning',
    'greeting.afternoon': 'Good afternoon',
    'greeting.evening': 'Good evening',
    'quickActions': 'Quick Actions',
    'newReferral': 'New Referral',
    'newReferral.desc': 'Submit a patient referral request',
    'myReferrals': 'My Referrals',
    'myReferrals.desc': 'View all your submitted referrals',
    'directory': 'Clinical Directory',
    'directory.desc': 'View capacity & service availability',
    'recentReferrals': 'Recent Referrals',
    'seeAll': 'See all',
    'active': 'Active',
    'total': 'Total',
    'done': 'Done',
  },
  ti: {
    'greeting': 'ደሓንዶ ሓዲርኩም',
    'greeting.afternoon': 'ከመይ ውዒልኩም',
    'greeting.evening': 'ከመይ ኣምሲኹም',
    'quickActions': 'ቅልጡፍ ስጉምቲ',
    'newReferral': 'ሓዱሽ ሪፈራል',
    'newReferral.desc': 'ናይ ሕሙም ሪፈራል ሕቶ ኣቕርብ',
    'myReferrals': 'ናተይ ሪፈራል',
    'myReferrals.desc': 'ኩሎም ዘቕረብካዮም ሪፈራል ርአ',
    'directory': 'ክሊኒካዊ ማህደር',
    'directory.desc': 'ዓቕምን ኣገልግሎትን ርአ',
    'recentReferrals': 'ቀረባ ግዜ ዝተገብሩ ሪፈራል',
    'seeAll': 'ኩሉ ርአ',
    'active': 'ንጡፍ',
    'total': 'ድምር',
    'done': 'ዝተወድአ',
  }
};

export function useTranslation() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    // Check local storage for language preference
    const saved = localStorage.getItem('trms_lang') as Language;
    if (saved && (saved === 'en' || saved === 'ti')) {
      setLang(saved);
    }
  }, []);

  const t = (key: string): string => {
    return dictionaries[lang][key] || key;
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('trms_lang', newLang);
  };

  return { t, lang, changeLanguage };
}
