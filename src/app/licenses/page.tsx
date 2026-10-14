'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Printer, Search, X, Check, ChevronDown } from 'lucide-react';

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="text-blue-600 font-bold">{children}</span>
);

export default function LicensesPage() {
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Producer Settings
  const [producerFullName, setProducerFullName] = useState('');
  const [stageName, setStageName] = useState('');
  const [producerAddress, setProducerAddress] = useState('');
  
  const [mp3Price, setMp3Price] = useState('29.99');
  const [wavPrice, setWavPrice] = useState('49.99');
  const [trackoutPrice, setTrackoutPrice] = useState('99.99');
  const [unlimitedPrice, setUnlimitedPrice] = useState('149.99');
  const [exclusivePrice, setExclusivePrice] = useState('199.99');

  const [mp3StreamLimit, setMp3StreamLimit] = useState('100000');
  const [wavStreamLimit, setWavStreamLimit] = useState('500000');
  const [trackoutStreamLimit, setTrackoutStreamLimit] = useState('1000000');

  const [producerPublishing, setProducerPublishing] = useState('0');

  // Form State
  const [selectedBeatId, setSelectedBeatId] = useState('');
  const [customBeatName, setCustomBeatName] = useState('');
  const [buyerName, setBuyerName] = useState(''); // Licensee
  const [selectedLicenseType, setSelectedLicenseType] = useState('mp3');
  const [customPrice, setCustomPrice] = useState('29.99');

  // Modal State
  const [isBeatModalOpen, setIsBeatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [customBeatInput, setCustomBeatInput] = useState('');

  // Initialization from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMp3Price = localStorage.getItem('mp3Price');
      if (storedMp3Price !== null) setMp3Price(storedMp3Price);
      
      const storedWavPrice = localStorage.getItem('wavPrice');
      if (storedWavPrice !== null) setWavPrice(storedWavPrice);
      
      const storedTrackoutPrice = localStorage.getItem('trackoutPrice');
      if (storedTrackoutPrice !== null) setTrackoutPrice(storedTrackoutPrice);
      
      const storedUnlimitedPrice = localStorage.getItem('unlimitedPrice');
      if (storedUnlimitedPrice !== null) setUnlimitedPrice(storedUnlimitedPrice);
      
      const storedExclusivePrice = localStorage.getItem('exclusivePrice');
      if (storedExclusivePrice !== null) setExclusivePrice(storedExclusivePrice);

      const storedMp3StreamLimit = localStorage.getItem('mp3StreamLimit');
      if (storedMp3StreamLimit !== null) setMp3StreamLimit(storedMp3StreamLimit);

      const storedWavStreamLimit = localStorage.getItem('wavStreamLimit');
      if (storedWavStreamLimit !== null) setWavStreamLimit(storedWavStreamLimit);

      const storedTrackoutStreamLimit = localStorage.getItem('trackoutStreamLimit');
      if (storedTrackoutStreamLimit !== null) setTrackoutStreamLimit(storedTrackoutStreamLimit);
      
      const storedProducerPublishing = localStorage.getItem('producerPublishing');
      if (storedProducerPublishing !== null) setProducerPublishing(storedProducerPublishing);
      
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever these change, but only after initial load
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('mp3Price', mp3Price);
      localStorage.setItem('wavPrice', wavPrice);
      localStorage.setItem('trackoutPrice', trackoutPrice);
      localStorage.setItem('unlimitedPrice', unlimitedPrice);
      localStorage.setItem('exclusivePrice', exclusivePrice);

      localStorage.setItem('mp3StreamLimit', mp3StreamLimit);
      localStorage.setItem('wavStreamLimit', wavStreamLimit);
      localStorage.setItem('trackoutStreamLimit', trackoutStreamLimit);
      
      localStorage.setItem('producerPublishing', producerPublishing);
    }
  }, [isLoaded, mp3Price, wavPrice, trackoutPrice, unlimitedPrice, exclusivePrice, mp3StreamLimit, wavStreamLimit, trackoutStreamLimit, producerPublishing]);

  const fetchBeats = useCallback(async (userId: string) => {
    setLoading(true);
    const { data } = await supabase.from('beats').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setBeats(data || []);
    if (data && data.length > 0) {
      setSelectedBeatId(data[0].id);
    }
    setLoading(false);
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('full_name, stage_name, address').eq('id', userId).single();
    if (data) {
      setProducerFullName(data.full_name || '');
      setStageName(data.stage_name || '');
      setProducerAddress(data.address || '');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user?.email && !stageName) {
        setStageName(user.email.split('@')[0]);
      }
      setAuthChecking(false);
      if (user) {
        fetchBeats(user.id);
        fetchProfile(user.id);
      } else {
        setLoading(false);
      }
    });
  }, [fetchBeats, fetchProfile]);

  const LICENSE_TYPES = [
    { id: 'mp3', name: 'MP3 Lease', defaultPrice: mp3Price, isExclusive: false, features: 'MP3 file, Non-Exclusive rights, Limited streams/copies.' },
    { id: 'wav', name: 'WAV Lease', defaultPrice: wavPrice, isExclusive: false, features: 'WAV file, Non-Exclusive rights, Limited streams/copies.' },
    { id: 'trackout', name: 'Trackout Lease', defaultPrice: trackoutPrice, isExclusive: false, features: 'WAV + Trackouts, Non-Exclusive rights, Limited streams/copies.' },
    { id: 'unlimited', name: 'Unlimited Lease', defaultPrice: unlimitedPrice, isExclusive: false, features: 'All Files, Non-Exclusive rights, Unlimited streams.' },
    { id: 'exclusive', name: 'Exclusive Rights', defaultPrice: exclusivePrice, isExclusive: true, features: 'All Files, Exclusive rights, 100% Publishing.' },
  ];

  // Auto-update price when license type changes
  useEffect(() => {
    if (isLoaded) {
      const selected = LICENSE_TYPES.find(t => t.id === selectedLicenseType);
      if (selected) {
        setCustomPrice(selected.defaultPrice);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLicenseType, isLoaded]);

  const selectedBeat = beats.find(b => b.id === selectedBeatId);
  const currentLicense = LICENSE_TYPES.find(t => t.id === selectedLicenseType) || LICENSE_TYPES[0];

  const handlePrint = () => {
    window.print();
  };

  const sortedBeats = [...beats]
    .filter(b => (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'bpm') return (a.bpm || 0) - (b.bpm || 0);
      if (sortBy === 'genre') return (a.genre || '').localeCompare(b.genre || '');
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  if (authChecking || !isLoaded) {
    return <div className="p-8 text-center text-gray-500">Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto pb-12 text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-gray-500">You need to log in to generate licenses.</p>
        <a href="/login?next=%2Flicenses" className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg font-medium">Go to Login</a>
      </div>
    );
  }

  const currentStreamLimit = 
    selectedLicenseType === 'mp3' ? mp3StreamLimit :
    selectedLicenseType === 'wav' ? wavStreamLimit :
    selectedLicenseType === 'trackout' ? trackoutStreamLimit : 'Unlimited';

  const dateStr = new Date().toLocaleDateString();
  const licensor = producerFullName || '[Licensor]';
  const licensee = buyerName || '[Licensee]';
  const stage = stageName || '[StageName]';
  const addr = producerAddress || '[Address]';
  const beatTitle = customBeatName || selectedBeat?.title || '[BeatName]';
  const price = customPrice || '0.00';
  const licensorUpper = licensor.toUpperCase();
  const parsedPublishing = Math.min(100, Math.max(0, Number(producerPublishing || 0)));

  return (
    <div className="max-w-7xl mx-auto pb-12 flex items-stretch gap-8 print:block">
      {/* Configuration Panel - Hidden when printing */}
      <div className="w-1/3 shrink-0 print:hidden flex flex-col">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex-1 flex flex-col">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-6">License Generator Settings</h2>
          
          <div className="space-y-5">
            {/* Producer Global Settings */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Your Producer Details (From Settings)</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Legal Name (Licensor)</label>
                <input 
                  type="text" 
                  value={producerFullName} 
                  onChange={e => setProducerFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Stage Name</label>
                <input 
                  type="text" 
                  value={stageName} 
                  onChange={e => setStageName(e.target.value)}
                  placeholder="e.g. DJ Khaleed"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
                <textarea 
                  value={producerAddress} 
                  onChange={e => setProducerAddress(e.target.value)}
                  placeholder="123 Music Lane..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  rows={2}
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Default Prices</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">MP3 Price</label>
                  <input type="number" value={mp3Price} onChange={e => setMp3Price(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">WAV Price</label>
                  <input type="number" value={wavPrice} onChange={e => setWavPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Trackout Price</label>
                  <input type="number" value={trackoutPrice} onChange={e => setTrackoutPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unlimited Price</label>
                  <input type="number" value={unlimitedPrice} onChange={e => setUnlimitedPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Exclusive Price</label>
                  <input type="number" value={exclusivePrice} onChange={e => setExclusivePrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">Default Stream Limits</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">MP3 Stream Limit</label>
                  <input type="number" value={mp3StreamLimit} onChange={e => setMp3StreamLimit(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">WAV Stream Limit</label>
                  <input type="number" value={wavStreamLimit} onChange={e => setWavStreamLimit(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Trackout Stream Limit</label>
                  <input type="number" value={trackoutStreamLimit} onChange={e => setTrackoutStreamLimit(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Document Specific Info */}
            <h3 className="text-sm font-bold text-gray-800">Current Agreement Info</h3>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Beat *</label>
              <button 
                type="button"
                onClick={() => setIsBeatModalOpen(true)}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black hover:bg-gray-50"
              >
                <span className="truncate pr-2">
                  {customBeatName || selectedBeat?.title || 'Select a beat...'}
                </span>
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Buyer Name (Licensee) *</label>
              <input 
                type="text" 
                value={buyerName} 
                onChange={e => setBuyerName(e.target.value)}
                placeholder="e.g. Drake"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">License Type *</label>
              <div className="grid grid-cols-1 gap-2">
                {LICENSE_TYPES.map(type => (
                  <label
                    key={type.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLicenseType === type.id 
                        ? 'border-black bg-gray-50 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="licenseType"
                        value={type.id}
                        checked={selectedLicenseType === type.id}
                        onChange={e => {
                          setSelectedLicenseType(e.target.value);
                          const selected = LICENSE_TYPES.find(t => t.id === e.target.value);
                          if (selected) {
                            setCustomPrice(selected.defaultPrice);
                          }
                        }}
                        className="w-4 h-4 text-black focus:ring-black border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-900">{type.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">${type.defaultPrice}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">License Price ($) *</label>
              <input 
                type="number" 
                value={customPrice} 
                onChange={e => setCustomPrice(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Producer Publishing % (0-100)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={producerPublishing} 
                onChange={e => setProducerPublishing(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>

            <button 
              onClick={handlePrint}
              disabled={!(selectedBeatId || customBeatName) || !buyerName || !producerFullName}
              className="w-full mt-4 flex items-center justify-center space-x-2 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:bg-black disabled:text-white disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>


      {/* Preview Panel - This gets printed */}
      <div className="flex-1 flex flex-col print:block print:w-full print:m-0 print:bg-white print:text-black">
        <div className="grow bg-white border border-gray-200 rounded-xl p-10 shadow-sm min-h-[842px] print:border-none print:shadow-none print:p-0 font-serif break-words">
          
          <h1 className="text-3xl font-serif font-bold text-center mb-2">BEAT LICENSE AGREEMENT</h1>
          <p className="text-center italic mb-8">Type: <span className="text-blue-600 font-bold">{currentLicense.id === 'exclusive' ? 'Exclusive Rights' : 'Non-Exclusive Rights'}</span></p>

          <div className="space-y-4 text-sm leading-relaxed text-gray-800">
            {currentLicense.isExclusive ? (
              <>
                <p>Header: License Agreement(EXCLUSIVE RIGHTS)Sound Recording/BEATS</p>
                <p>
                  THIS LICENCE AGREEMENT is made on <Highlight>{dateStr}</Highlight> ("Effective Date") by and between <Highlight>{licensee}</Highlight> (hereinafter referred to as the "Licensee") ,and <Highlight>{licensor}</Highlight> (hereinafter referred to as the "Licensor") also, if applicable, professionally known as <Highlight>{stage}</Highlight>, whose principal address is <Highlight>{addr}</Highlight>. Licensor warrants that it controls the mechanical rights in and to the copyrighted musical works entitled "<Highlight>{beatTitle}</Highlight>" ("Composition") as of and prior to the date first written above. The Composition, including the music thereof, was composed by <Highlight>{stage}</Highlight> ("Songwriter") managed under the Licensor.
                </p>
                <p>
                  <strong>Master Use.</strong> The Licensor hereby grants to Licensee an exclusive license (this "License") to record vocal synchronization to the Composition partly or in its entirety and substantially in its original form ("Master Recording").
                </p>
                <p>
                  <strong>Mechanical Rights.</strong> The Licensor hereby grants to Licensee an exclusive license to use Master Recording in the reproduction, duplication, manufacture, and distribution of phonograph records, cassette tapes, compact disk, digital downloads, other miscellaneous audio and digital recordings, and any lifts and versions thereof (collectively, the "Recordings", and individually, a "Recordings") worldwide for unlimited copies of such Recordings or any combination of such Recordings, condition upon the payment to the Licensor a sum of <Highlight>${price} US Dollars</Highlight>, receipt of which is confirmed.
                </p>
                <p>
                  <strong>Performance Rights.</strong> The Licensor here by grants to Licensee an exclusive license to use the Master Recording in unlimited for-profit performances, shows, or concerts.
                </p>
                <p>
                  <strong>Broadcast Rights.</strong> The Licensor hereby grants to Licensee an exclusive license to broadcast or air the Master Recording in unlimited amounts of radio stations.
                </p>
                <p>
                  <strong>Credit.</strong> Licensee shall acknowledge the original authorship of the Composition appropriately and reasonably in all media and performance formats under the name "<Highlight>{stage}</Highlight>" in writing where possible and vocally otherwise.
                </p>
                <p>
                  <strong>Miscellaneous.</strong> This license is non-transferable and is limited to the Composition specified above, constitutes the entire agreement between the Licensor and the Licensee relating to the Composition, and shall be binding upon both the Licensor and the Licensee and their respective successors, assigns, and legal representatives.
                </p>
                <p>
                  <strong>Publishing.</strong><br/>
                  <Highlight>{licensee}</Highlight>, owns <strong>{100 - parsedPublishing}%</strong> of publishing rights. <Highlight>{licensor}</Highlight>, owns <strong>{parsedPublishing}%</strong> of publishing rights.<br/>
                  Finished audio recording by Licensee of audio release can distribute to music supervisors for consideration of synchronization licensing. Only the recording artist or recording company can monetize with this license.
                </p>
                <p className="uppercase font-bold mt-4">
                  <strong>THE PARTIES HAVE DULY EXECUTED THIS AGREEMENT on the date first written above.</strong>
                </p>
                <div className="mt-8">
                  <p>Licensor:<br/>
                  <Highlight>{licensorUpper}</Highlight> Date: <Highlight>{dateStr}</Highlight><br/>
                  <Highlight>{licensor}</Highlight> - Producer Authorized Signing Officer</p>
                </div>
                <div className="mt-4">
                  <p>Licensee:<br/>
                  <Highlight>{licensee}</Highlight> Date: <Highlight>{dateStr}</Highlight><br/>
                  <Highlight>{licensee}</Highlight> - Artist Authorized Signing Officer</p>
                </div>
              </>
            ) : (
              <>
                <p>Header: License Agreement(NON-EXCLUSIVE RIGHTS)Sound Recording/BEATS</p>
                <p>
                  THIS LICENCE AGREEMENT is made on <Highlight>{dateStr}</Highlight> ("Effective Date") by and between <Highlight>{licensee}</Highlight> (hereinafter referred to as the "Licensee") also, if applicable, and <Highlight>{licensor}</Highlight> (hereinafter referred to as the "Licensor") also, if applicable, professionally known as <Highlight>{stage}</Highlight>, whose principle address is <Highlight>{addr}</Highlight>. Licensor warrants that it controls the mechanical rights in and to the copyrighted musical works entitled "<Highlight>{beatTitle}</Highlight>" ("Composition") as of and prior to the date first written above. The Composition, including the music thereof, was composed by <Highlight>{licensor}</Highlight> ("Songwriter") managed under the Licensor.
                </p>
                <p>
                  <strong>Master Use.</strong> The Licensor hereby grants to Licensee a non-exclusive license (this "License") to record vocal synchronization to the Composition partly or in its entirety and substantially in its original form ("Master Recording").
                </p>
                <p>
                  <strong>Mechanical Rights.</strong> The Licensor hereby grants to Licensee a non-exclusive license to use Master Recording in the reproduction, duplication, manufacture, and distribution of phonograph records, cassette tapes, compact disk, digital downloads, other miscellaneous audio and digital recordings, and any lifts and versions thereof (collectively, the "Recordings", and individually, a "Recordings") worldwide for up to the pressing or selling a total of <Highlight>{currentStreamLimit}</Highlight> copies of such Recordings or any combination of such Recordings, condition upon the payment to the Licensor a sum of <Highlight>${price} US Dollars</Highlight>, receipt of which is confirmed.
                </p>
                <p>
                  <strong>License Upgrade.</strong> Upon reaching the limit of <Highlight>{currentStreamLimit}</Highlight> copies or streams as specified in the Mechanical Rights section, the Licensee is required to upgrade this license to an Exclusive Rights Agreement or negotiate a new agreement that includes a 33% publishing split in favor of the Licensor.
                </p>
                <p>
                  <strong>Synchronization Rights.</strong> The Licensor hereby grants limited synchronization rights for one (1) music video streamed online (Youtube, Vimeo, etc..)
                </p>
                <p>
                  <strong>Broadcast Rights.</strong> The Licensor hereby grants to Licensee a non-exclusive license to broadcast or air the Master Recording in two (2) radio stations through two (2) station channels, respectively. The Licensee shall not be permitted to receive compensation for such broadcasting or up to unlimited streams total on all websites. A separate synchronization license will need to be purchased for distribution of video to Television, Film or Video game.
                </p>
                <p>
                  <strong>Credit.</strong> Licensee shall acknowledge the original authorship of the Composition appropriately and reasonably in all media and performance formats under the name "<Highlight>{stage}</Highlight>" in writing where possible and vocally otherwise.
                </p>
                <p>
                  <strong>Delivery.</strong> The Composition shall be delivered via email to an email address that Licensee provided to Licensor. Licensee shall receive an email from containing an attachment or link from which they can download the Composition.
                </p>
                <p>
                  <strong>Indemnification.</strong> Accordingly, Licensee agrees to indemnify and hold Licensor harmless from and against any and all claims, losses, damages, costs, expenses, including, without limitation, reasonable attorney's fees, arising of or resulting from a claimed breach of any of Licensee's representations, warranties or agreements hereunder.
                </p>
                <p>
                  <strong>Governing Law.</strong> This License is governed by and shall be construed under the law of the <strong>State of <Highlight>{addr}</Highlight></strong>, without regard to the conflicts of laws principles thereof.
                </p>
                <p>
                  <strong>Publishing.</strong><br/>
                  <Highlight>{licensee}</Highlight>, owns <strong>{100 - parsedPublishing}%</strong> of publishing rights. <Highlight>{licensor}</Highlight>, owns <strong>{parsedPublishing}%</strong> of publishing rights.
                </p>
                <p className="uppercase font-bold mt-4">
                  <strong>THE PARTIES HAVE DULY EXECUTED THIS AGREEMENT on the date first written above.</strong>
                </p>
                <div className="mt-8">
                  <p>Licensor:<br/>
                  <Highlight>{licensorUpper}</Highlight> Date: <Highlight>{dateStr}</Highlight><br/>
                  <Highlight>{licensor}</Highlight> - Producer Authorized Signing Officer</p>
                </div>
                <div className="mt-4">
                  <p>Licensee:<br/>
                  <Highlight>{licensee}</Highlight> Date: <Highlight>{dateStr}</Highlight><br/>
                  <Highlight>{licensee}</Highlight> - Artist Authorized Signing Officer</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Beat Selection Modal */}
      {isBeatModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Select Beat</h3>
              <button onClick={() => setIsBeatModalOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 flex flex-col">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search beats..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                />
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Your Beats</span>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
                  >
                    <span>{sortBy === 'date' ? 'Sort by Date' : sortBy === 'name' ? 'Sort by Name' : sortBy === 'bpm' ? 'Sort by BPM' : 'Sort by Genre'}</span>
                    <svg className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>

                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                        {[
                          { id: 'date', label: 'Sort by Date' },
                          { id: 'name', label: 'Sort by Name' },
                          { id: 'bpm', label: 'Sort by BPM' },
                          { id: 'genre', label: 'Sort by Genre' }
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => { setSortBy(option.id); setIsSortOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${sortBy === option.id ? 'text-blue-600 font-semibold bg-blue-50/50 hover:bg-blue-50' : 'text-gray-700'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

              </div>

              <div className="space-y-2">
                {sortedBeats.map(beat => (
                  <button
                    key={beat.id}
                    onClick={() => {
                      setSelectedBeatId(beat.id);
                      setCustomBeatName('');
                      setIsBeatModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                      selectedBeatId === beat.id && !customBeatName
                        ? 'border-black bg-gray-50'
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{beat.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {beat.bpm ? `${beat.bpm} BPM • ` : ''}{new Date(beat.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {selectedBeatId === beat.id && !customBeatName && <Check size={16} className="text-black" />}
                  </button>
                ))}
                {sortedBeats.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-500">No beats found matching your search.</div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Or enter a custom beat name:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Custom Beat Title"
                    value={customBeatInput}
                    onChange={e => setCustomBeatInput(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                  <button
                    onClick={() => {
                      if (customBeatInput.trim()) {
                        setCustomBeatName(customBeatInput.trim());
                        setSelectedBeatId('');
                        setCustomBeatInput('');
                        setIsBeatModalOpen(false);
                      }
                    }}
                    className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors shrink-0"
                  >
                    Use Custom
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
