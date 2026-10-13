'use client';

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  CloudUpload,
  Share2,
  Type,
  FileVideo,
  CircleCheck,
  X,
  Sparkles,
  Clock,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PublisherPage() {
  // Feature flag: set to false once TikTok & Instagram production API credentials are ready
  const isAwaitingApiKeys = true;

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [igConnected, setIgConnected] = useState(false);
  const [ttConnected, setTtConnected] = useState(false);
  const [publishingState, setPublishingState] = useState<'idle' | 'uploading' | 'publishing' | 'done'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = () => {
    setIsHovering(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovering(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'video/mp4' || file.type === 'video/quicktime') {
        setVideoFile(file);
      } else {
        alert('Please upload an MP4 or MOV file.');
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'video/mp4' || file.type === 'video/quicktime') {
        setVideoFile(file);
      } else {
        alert('Please upload an MP4 or MOV file.');
      }
    }
  };

  const handleRemoveFile = () => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePublish = async () => {
    if (!videoFile) {
      alert('Please upload a video first.');
      return;
    }
    if (!igConnected && !ttConnected) {
      alert('Please connect at least one platform.');
      return;
    }
    if (!description.trim()) {
      alert('Please provide a caption.');
      return;
    }
    
    try {
      setPublishingState('uploading');
      
      const nameParts = videoFile.name.split('.');
      const fileExt = nameParts.length > 1 ? nameParts.pop() : 'mp4';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('temp_social_videos')
        .upload(filePath, videoFile);

      if (uploadError) {
        throw new Error('Upload failed: ' + uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('temp_social_videos')
        .getPublicUrl(filePath);

      setPublishingState('publishing');

      const platforms = [];
      if (igConnected) platforms.push('instagram');
      if (ttConnected) platforms.push('tiktok');

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: publicUrl,
          filePath: filePath,
          text: description,
          platforms
        }),
      });

      if (!res.ok) {
        let errMessage = res.statusText;
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch (e) {
          // Ignore JSON parse error and use statusText
        }
        throw new Error('Publishing failed: ' + errMessage);
      }

      setPublishingState('done');
      
      // Delay alert to allow React to render the 'done' state
      setTimeout(() => {
        alert('Published successfully!');
        setVideoFile(null);
        setDescription('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setPublishingState('idle');
      }, 100);
      
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(errorMessage);
      setPublishingState('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
              <Share2 size={32} className="text-blue-600 mr-3" />
              Social Auto-Publisher
              <span className="ml-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                Coming Soon
              </span>
            </h2>
            <p className="text-gray-500 mt-2">
              Upload your beat video once and publish it across multiple social platforms automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice Banner */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-pink-50 border border-blue-200/80 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-100/90 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                Coming Soon • Awaiting API Approval
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Social Auto-Publisher is Launching Soon
              </h3>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl leading-relaxed">
                This feature is fully developed and will be enabled automatically as soon as our developer API credentials and production permissions are approved by <strong>TikTok</strong> and <strong>Instagram</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Live Platform Review Status */}
        <div className="mt-5 pt-4 border-t border-blue-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-white/90 rounded-xl border border-blue-100 shadow-2xs">
            <span className="font-semibold text-gray-800 flex items-center gap-2">
              <KeyRound size={15} className="text-pink-600" /> Instagram Graph API
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              Awaiting App Review
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-white/90 rounded-xl border border-blue-100 shadow-2xs">
            <span className="font-semibold text-gray-800 flex items-center gap-2">
              <KeyRound size={15} className="text-gray-900" /> TikTok Content Posting API
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              Awaiting Developer Keys
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload & Description */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Upload Box */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Video File</h3>
            
            {!videoFile ? (
              <div 
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isHovering ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="video/mp4,video/quicktime" 
                  onChange={handleFileChange}
                />
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 pointer-events-none">
                  <CloudUpload size={32} className="text-blue-600 pointer-events-none" />
                </div>
                <p className="text-gray-900 font-medium mb-1 pointer-events-none">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm pointer-events-none">MP4 or MOV (max 100MB)</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <FileVideo size={24} />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium truncate max-w-[200px] md:max-w-xs">{videoFile.name}</p>
                    <p className="text-gray-500 text-sm">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={handleRemoveFile}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Description Box */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Type size={20} className="mr-2 text-gray-400" />
              Caption & Hashtags
            </h3>
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y min-h-[150px]"
              placeholder="Write your caption here... #beatmaker #producer"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs text-gray-400">{description.length} characters</span>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Integration & Actions */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Preview Mode
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-6">Connect your social accounts to publish directly.</p>
            
            <div className="space-y-4">
              {/* Instagram Button */}
              <div 
                className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                  igConnected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-200 hover:bg-pink-50/50'
                }`}
                onClick={() => setIgConnected(!igConnected)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${igConnected ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Instagram</p>
                    <p className="text-xs text-gray-500">{igConnected ? 'Connected' : 'Not connected'}</p>
                  </div>
                </div>
                {igConnected && <CircleCheck size={20} className="text-pink-500" />}
              </div>

              {/* TikTok Button */}
              <div 
                className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
                  ttConnected ? 'border-black bg-gray-100' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setTtConnected(!ttConnected)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${ttConnected ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">TikTok</p>
                    <p className="text-xs text-gray-500">{ttConnected ? 'Connected' : 'Not connected'}</p>
                  </div>
                </div>
                {ttConnected && <CircleCheck size={20} className="text-black" />}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-500">Video uploaded:</span>
                <span className="font-medium text-gray-900">{videoFile ? 'Yes' : 'No'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Platforms selected:</span>
                <span className="font-medium text-gray-900">
                  {[igConnected && 'IG', ttConnected && 'TikTok'].filter(Boolean).join(', ') || 'None'}
                </span>
              </li>
            </ul>

            {/* Coming soon button while awaiting API keys */}
            {isAwaitingApiKeys ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      'Social Auto-Publisher is launching soon! We are awaiting final API review and developer credentials from TikTok and Instagram.'
                    )
                  }
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-md flex justify-center items-center text-sm cursor-pointer"
                >
                  <Clock size={16} className="mr-2" />
                  Coming Soon (Awaiting API Keys)
                </button>
                <p className="text-[11px] text-center text-gray-400">
                  Upload & configuration are enabled in preview mode.
                </p>
              </div>
            ) : (
              <button
                onClick={handlePublish}
                disabled={publishingState !== 'idle' || !videoFile || (!igConnected && !ttConnected)}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex justify-center items-center"
              >
                {publishingState === 'uploading' && (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Uploading...</span>
                  </span>
                )}
                {publishingState === 'publishing' && (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Publishing...</span>
                  </span>
                )}
                {publishingState === 'done' && (
                  <span className="flex items-center space-x-2">
                    <CircleCheck size={20} className="text-white" />
                    <span>Done</span>
                  </span>
                )}
                {publishingState === 'idle' && 'Publish to Selected Platforms'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
