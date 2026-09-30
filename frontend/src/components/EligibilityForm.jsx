import React, { useState } from 'react';
import { User, MapPin, GraduationCap, IndianRupee, Sparkles, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';

const MP_DISTRICTS = [
  "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind",
  "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar",
  "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad (Narmadapuram)", "Indore", "Jabalpur",
  "Jhabua", "Katni", "Khandwa", "Khargone", "Maihar", "Mandla", "Mandsaur", "Morena",
  "Mauganj", "Narsinghpur", "Neemuch", "Niwari", "Pandhurna", "Panna", "Raisen", "Rajgarh",
  "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur",
  "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"
];

const PRESET_PERSONAS = [
  {
    name: "Aarti",
    tag: "OBC Student",
    description: "19 yr, Rural OBC, UG, 65% in 12th",
    profile: {
      age: 19,
      gender: "female",
      residency: "Madhya Pradesh",
      district: "Bhopal",
      rural_or_urban: "rural",
      category: "OBC",
      annual_family_income: 200000,
      education_level: "undergraduate",
      class12_percentage: 65,
      occupation: "student",
      marital_status: "unmarried"
    }
  },
  {
    name: "Ramesh",
    tag: "ITI Graduate",
    description: "22 yr, Male, ITI, Unemployed",
    profile: {
      age: 22,
      gender: "male",
      residency: "Madhya Pradesh",
      district: "Indore",
      rural_or_urban: "urban",
      category: "General",
      annual_family_income: 300000,
      education_level: "iti",
      class12_percentage: 58,
      occupation: "unemployed",
      marital_status: "unmarried"
    }
  },
  {
    name: "Sunita",
    tag: "Low-Income Homemaker",
    description: "34 yr, Married woman, ₹1.5L income",
    profile: {
      age: 34,
      gender: "female",
      residency: "Madhya Pradesh",
      district: "Ujjain",
      rural_or_urban: "rural",
      category: "General",
      annual_family_income: 150000,
      education_level: "class_1_10",
      class12_percentage: null,
      occupation: "homemaker",
      marital_status: "married",
      owns_agricultural_land_acres: 1,
      owns_four_wheeler: false,
      income_tax_payer: false
    }
  },
  {
    name: "Neha",
    tag: "Infant Girl Child",
    description: "0 yr, Born in MP, Anganwadi Reg.",
    profile: {
      age: 0,
      gender: "female",
      residency: "Madhya Pradesh",
      district: "Jabalpur",
      rural_or_urban: "rural",
      category: "OBC",
      annual_family_income: 120000,
      birth_year: 2026,
      registered_at_anganwadi: true,
      parents_income_tax_payer: false,
      education_level: "any",
      occupation: "other"
    }
  }
];

const INITIAL_FORM = {
  age: 20,
  gender: 'female',
  residency: 'Madhya Pradesh',
  district: 'Bhopal',
  rural_or_urban: 'rural',
  category: 'OBC',
  annual_family_income: 200000,
  education_level: 'undergraduate',
  class12_percentage: 65,
  occupation: 'student',
  marital_status: 'unmarried',
  registered_at_anganwadi: true,
  parents_income_tax_payer: false,
  owns_agricultural_land_acres: 0,
  owns_four_wheeler: false,
  income_tax_payer: false,
  is_ladli_behna_beneficiary: false,
  is_homeless_or_kutcha_house: false,
  excluded_from_pmay: false,
};

export default function EligibilityForm({ onSubmit, isLoading, language }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [activeStep, setActiveStep] = useState(1);

  const t = {
    quickSelect: language === 'hi' ? 'त्वरित प्रोफाइल चुनें:' : 'Try Quick Test Persona:',
    personalTab: language === 'hi' ? 'व्यक्तिगत विवरण' : 'Personal Details',
    locationTab: language === 'hi' ? 'स्थान व श्रेणी' : 'Location & Category',
    educationTab: language === 'hi' ? 'शिक्षा व कार्य' : 'Education & Work',
    incomeTab: language === 'hi' ? 'आय व अन्य शर्तें' : 'Income & Criteria',
    age: language === 'hi' ? 'उम्र (वर्ष)' : 'Age (Years)',
    gender: language === 'hi' ? 'लिंग' : 'Gender',
    female: language === 'hi' ? 'महिला' : 'Female',
    male: language === 'hi' ? 'पुरुष' : 'Male',
    other: language === 'hi' ? 'अन्य' : 'Other',
    marital: language === 'hi' ? 'वैवाहिक स्थिति' : 'Marital Status',
    unmarried: language === 'hi' ? 'अविवाहित' : 'Unmarried',
    married: language === 'hi' ? 'विवाहित' : 'Married',
    widowed: language === 'hi' ? 'विधवा' : 'Widowed',
    divorced: language === 'hi' ? 'तलाकशुदा' : 'Divorced',
    residency: language === 'hi' ? 'मूल निवास (Domicile)' : 'Residency / Domicile',
    mpResident: language === 'hi' ? 'मध्य प्रदेश (Madhya Pradesh)' : 'Madhya Pradesh (MP Domicile)',
    otherState: language === 'hi' ? 'अन्य राज्य' : 'Other State',
    area: language === 'hi' ? 'क्षेत्र का प्रकार' : 'Area Type',
    rural: language === 'hi' ? 'ग्रामीण (Rural)' : 'Rural',
    urban: language === 'hi' ? 'शहरी (Urban)' : 'Urban',
    district: language === 'hi' ? 'जिला (MP District)' : 'District in MP',
    category: language === 'hi' ? 'सामाजिक श्रेणी (Caste/Category)' : 'Social Category',
    eduLevel: language === 'hi' ? 'वर्तमान / उच्चतम शिक्षा स्तर' : 'Education Level',
    class12Pct: language === 'hi' ? 'कक्षा 12वीं में प्राप्तांक (%)' : 'Class 12 Percentage (%)',
    occupation: language === 'hi' ? 'व्यवसाय / कार्य' : 'Current Occupation',
    student: language === 'hi' ? 'विद्यार्थी (Student)' : 'Student',
    unemployed: language === 'hi' ? 'बेरोजगार (Unemployed)' : 'Unemployed',
    homemaker: language === 'hi' ? 'गृहिणी (Homemaker)' : 'Homemaker',
    employed: language === 'hi' ? 'रोजगाररत (Employed)' : 'Employed / Private Job',
    income: language === 'hi' ? 'वार्षिक पारिवारिक आय' : 'Annual Family Income (₹)',
    submitBtn: language === 'hi' ? 'पात्र योजनाएं खोजें' : 'Find Matching Schemes',
    searching: language === 'hi' ? 'योजनाएं जांची जा रही हैं...' : 'Evaluating Eligibility Rules...',
    reset: language === 'hi' ? 'रीसेट करें' : 'Reset Form'
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyPersona = (p) => {
    setFormData({ ...INITIAL_FORM, ...p.profile });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, language });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-heading flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-300" />
              {language === 'hi' ? 'नागरिक पात्रता प्रश्नावली' : 'Citizen Eligibility Questionnaire'}
            </h2>
            <p className="text-emerald-100 text-sm mt-1">
              {language === 'hi'
                ? '8 सरल प्रश्नों के उत्तर दें और जानें आप मध्य प्रदेश की किन योजनाओं के लिए पात्र हैं।'
                : 'Answer a few structured questions to check eligibility across 13+ MP & Central schemes.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(INITIAL_FORM)}
            className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/20 self-start md:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            {t.reset}
          </button>
        </div>

        {/* Quick Persona Pickers */}
        <div className="mt-5 pt-4 border-t border-white/15">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200 block mb-2">
            {t.quickSelect}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_PERSONAS.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPersona(p)}
                className="text-left bg-white/10 hover:bg-white/25 active:bg-white/30 backdrop-blur-sm p-2 rounded-xl border border-white/20 transition-all text-white group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-amber-300 group-hover:underline">{p.name}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">{p.tag}</span>
                </div>
                <p className="text-[11px] text-emerald-100 truncate mt-0.5">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Step Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 text-xs font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveStep(1)}
          className={`flex items-center gap-1.5 px-4 py-3 border-b-2 whitespace-nowrap transition-all ${
            activeStep === 1 ? 'border-emerald-600 text-emerald-700 bg-white font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4 text-emerald-600" />
          <span>1. {t.personalTab}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStep(2)}
          className={`flex items-center gap-1.5 px-4 py-3 border-b-2 whitespace-nowrap transition-all ${
            activeStep === 2 ? 'border-emerald-600 text-emerald-700 bg-white font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>2. {t.locationTab}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStep(3)}
          className={`flex items-center gap-1.5 px-4 py-3 border-b-2 whitespace-nowrap transition-all ${
            activeStep === 3 ? 'border-emerald-600 text-emerald-700 bg-white font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <span>3. {t.educationTab}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveStep(4)}
          className={`flex items-center gap-1.5 px-4 py-3 border-b-2 whitespace-nowrap transition-all ${
            activeStep === 4 ? 'border-emerald-600 text-emerald-700 bg-white font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <IndianRupee className="w-4 h-4 text-emerald-600" />
          <span>4. {t.incomeTab}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Step 1: Personal Details */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Age */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.age}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={formData.age}
                    onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.age}
                    onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {formData.age === 0 ? (language === 'hi' ? 'नवजात शिशु (Infant Girl)' : 'Infant child (< 1 year)') : `${formData.age} years old`}
                </p>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.gender}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['female', 'male', 'other'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleChange('gender', g)}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.gender === g
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-1 ring-emerald-500 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t[g]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marital Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.marital}
                </label>
                <select
                  value={formData.marital_status}
                  onChange={(e) => handleChange('marital_status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-700"
                >
                  <option value="unmarried">{t.unmarried}</option>
                  <option value="married">{t.married}</option>
                  <option value="widowed">{t.widowed}</option>
                  <option value="divorced">{t.divorced}</option>
                  <option value="abandoned">{language === 'hi' ? 'परित्यक्ता (Abandoned)' : 'Abandoned'}</option>
                </select>
              </div>
            </div>

            {/* Special infant condition check if age <= 1 */}
            {formData.age <= 1 && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {language === 'hi' ? 'आंगनवाड़ी में जन्म पंजीकरण (Ladli Laxmi Check)' : 'Anganwadi Birth Registration'}
                  </p>
                  <p className="text-xs text-amber-700">
                    {language === 'hi' ? 'क्या बालिका का जन्म के 1 वर्ष के भीतर आंगनवाड़ी में पंजीकरण कराया गया है?' : 'Is the girl child registered at the local Anganwadi within 1 year of birth?'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.registered_at_anganwadi)}
                  onChange={(e) => handleChange('registered_at_anganwadi', e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <span>{language === 'hi' ? 'अगला: स्थान व श्रेणी' : 'Next: Location & Category'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Location & Category */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Residency */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.residency}
                </label>
                <select
                  value={formData.residency}
                  onChange={(e) => handleChange('residency', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-700"
                >
                  <option value="Madhya Pradesh">{t.mpResident}</option>
                  <option value="Other State">{t.otherState}</option>
                </select>
              </div>

              {/* Area Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.area}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['rural', 'urban'].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleChange('rural_or_urban', a)}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.rural_or_urban === a
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-1 ring-emerald-500 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t[a]}
                    </button>
                  ))}
                </div>
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.district}
                </label>
                <select
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-700"
                >
                  {MP_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Social Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.category}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['SC', 'ST', 'OBC', 'General', 'EWS'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleChange('category', cat)}
                      className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all ${
                        formData.category === cat
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold"
              >
                {language === 'hi' ? 'पिछला' : 'Back'}
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
              >
                <span>{language === 'hi' ? 'अगला: शिक्षा व कार्य' : 'Next: Education & Work'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Education & Occupation */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Education Level */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.eduLevel}
                </label>
                <select
                  value={formData.education_level}
                  onChange={(e) => handleChange('education_level', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-700"
                >
                  <option value="undergraduate">Undergraduate (BA / BSc / BCom / BTech / MBBS / etc.)</option>
                  <option value="class_12">Class 12th Passed</option>
                  <option value="class_11">Class 11th</option>
                  <option value="iti">ITI / Vocational</option>
                  <option value="diploma">Polytechnic / Diploma</option>
                  <option value="postgraduate">Postgraduate (MA / MSc / MTech / etc.)</option>
                  <option value="phd">PhD / Doctoral</option>
                  <option value="class_1_10">Class 1 to 10</option>
                  <option value="any">None / Other</option>
                </select>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.occupation}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'student', label: t.student },
                    { id: 'unemployed', label: t.unemployed },
                    { id: 'homemaker', label: t.homemaker },
                    { id: 'employed', label: t.employed }
                  ].map(occ => (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => handleChange('occupation', occ.id)}
                      className={`py-2 px-2 text-left rounded-xl border text-xs font-semibold transition-all ${
                        formData.occupation === occ.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {occ.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class 12th percentage */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.class12Pct}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="35"
                    max="100"
                    value={formData.class12_percentage || 60}
                    onChange={(e) => handleChange('class12_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="w-24 text-center py-1.5 px-3 bg-slate-100 border border-slate-300 rounded-xl font-bold text-emerald-700">
                    {formData.class12_percentage || 0}%
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {language === 'hi'
                    ? 'मेधावी (MMVY), गांव की बेटी व विक्रमादित्य छात्रवृत्ति के लिए आवश्यक'
                    : 'Required for MMVY (70%+), Gaon Ki Beti (60%+), and Vikramaditya (60%+)'}
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold"
              >
                {language === 'hi' ? 'पिछला' : 'Back'}
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
              >
                <span>{language === 'hi' ? 'अगला: आय व अन्य शर्तें' : 'Next: Income & Criteria'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Household & Income */}
        {activeStep === 4 && (
          <div className="space-y-6">
            {/* Income Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-slate-700">
                  {t.income}
                </label>
                <span className="text-base font-bold text-emerald-700">
                  ₹{(formData.annual_family_income || 0).toLocaleString('en-IN')} / year
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1000000"
                step="25000"
                value={formData.annual_family_income || 0}
                onChange={(e) => handleChange('annual_family_income', parseFloat(e.target.value) || 0)}
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              {/* Quick Lakh presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[50000, 150000, 250000, 600000, 800000].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleChange('annual_family_income', inc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      formData.annual_family_income === inc
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    ₹{(inc / 100000).toFixed(inc % 100000 === 0 ? 0 : 1)} Lakh
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Scheme Prerequisite Checkboxes */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                {language === 'hi' ? 'विशेष शर्तें (Optional Conditions for Edge Schemes):' : 'Additional Verification Flags:'}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.income_tax_payer)}
                    onChange={(e) => handleChange('income_tax_payer', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>{language === 'hi' ? 'परिवार में कोई आयकर दाता है?' : 'Family member pays Income Tax?'}</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.owns_four_wheeler)}
                    onChange={(e) => handleChange('owns_four_wheeler', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>{language === 'hi' ? 'परिवार में चार पहिया वाहन है?' : 'Family owns a four-wheeler vehicle?'}</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_ladli_behna_beneficiary)}
                    onChange={(e) => handleChange('is_ladli_behna_beneficiary', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>{language === 'hi' ? 'लाड़ली बहना योजना की सक्रिय लाभार्थी हैं?' : 'Already Ladli Behna beneficiary?'}</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_homeless_or_kutcha_house)}
                    onChange={(e) => handleChange('is_homeless_or_kutcha_house', e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>{language === 'hi' ? 'कच्चा मकान या आवासहीन?' : 'Homeless / Kutcha damaged house?'}</span>
                </label>
              </div>
            </div>

            {/* Submit and Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold"
              >
                {language === 'hi' ? 'पिछला' : 'Back'}
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 text-base"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.searching}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>{t.submitBtn}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
