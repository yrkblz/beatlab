'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, Users, LogIn, LogOut, Music2, HardDrive, Paperclip, CheckCircle2, BarChart3, Eye, Calendar, Folder, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MailerPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'stats'>('send');
  const [session, setSession] = useState<any>(null);

  // Form State
  const [emails, setEmails] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');

  // Attachments
  const [attachmentSource, setAttachmentSource] = useState<'supabase' | 'drive'>('supabase');
  const [supabaseBeats, setSupabaseBeats] = useState<any[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<{name: string, link: string}[]>([]);
  
  // Google Drive
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveHistory, setDriveHistory] = useState<{id: string, name: string}[]>([{id: 'root', name: 'My Drive'}]);

  async function reconnectGoogleDrive() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
  }

  // Campaign Statistics
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  // Campaign Selection and Deletion
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(null); // State for delete modal
  
  // State for 10-second undo
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[], backup: any[] } | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadSupabaseBeats(session.user.id);
        if (session.provider_token) loadDriveFiles(session.provider_token, 'root');
        if (activeTab === 'stats') {
          fetchCampaignStats(session.user.id);
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        loadSupabaseBeats(session.user.id);
        if (session.provider_token) loadDriveFiles(session.provider_token, 'root');
        if (activeTab === 'stats') {
          fetchCampaignStats(session.user.id);
        }
      } else {
        setCampaigns([]);
        setSupabaseBeats([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'stats' && session?.user?.id) {
      fetchCampaignStats(session.user.id);
    }
  }, [activeTab, session?.user?.id]);

  // Undo Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pendingDelete && undoSecondsLeft > 0) {
      interval = setInterval(() => {
        setUndoSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (pendingDelete && undoSecondsLeft === 0) {
      // Time elapsed - delete from database (only for the current logged-in user)
      let query = supabase.from('campaigns').delete().in('id', pendingDelete.ids);
      if (session?.user?.id) {
        query = query.eq('user_id', session.user.id);
      }
      query.then(() => {
        setPendingDelete(null);
        setSelectedCampaignIds([]);
      });
    }
    return () => clearInterval(interval);
  }, [pendingDelete, undoSecondsLeft, session?.user?.id]);

  async function fetchCampaignStats(userId?: string) {
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) {
      setCampaigns([]);
      return;
    }
    setLoadingStats(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`*, email_logs ( id, recipient_email, opened, opened_at )`)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        // If column user_id is not yet created or error occurs,
        // NEVER expose other users' campaigns!
        console.error('Error fetching user campaigns:', error);
        setCampaigns([]);
      } else {
        setCampaigns(data || []);
      }
    } catch (err) {
      console.error('Campaign stats fetch error:', err);
      setCampaigns([]);
    } finally {
      setLoadingStats(false);
    }
  }

  function initiateDeletion(ids: string[]) {
    setDeleteConfirmIds(ids);
  }

  function executeDeletion() {
    if (!deleteConfirmIds) return;
    const ids = deleteConfirmIds;
    setDeleteConfirmIds(null); // Close modal

    // 1. Create backup
    const campaignsToBackup = campaigns.filter(c => ids.includes(c.id));
    
    // 2. Activate pending delete state (10 seconds)
    setPendingDelete({ ids, backup: campaignsToBackup });
    setUndoSecondsLeft(10);

    // 3. Delete visually
    setCampaigns(campaigns.filter(c => !ids.includes(c.id)));
    if (selectedCampaign && ids.includes(selectedCampaign.id)) {
      setSelectedCampaign(null);
    }
  }

  function handleUndo() {
    if (!pendingDelete) return;
    
    // Restore campaigns
    setCampaigns(prev => {
      const restored = [...prev, ...pendingDelete.backup];
      return restored.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    
    // Reset deletion state
    setPendingDelete(null);
    setSelectedCampaignIds([]);
  }

  function toggleSelectAll() {
    if (selectedCampaignIds.length === campaigns.length) {
      setSelectedCampaignIds([]);
    } else {
      setSelectedCampaignIds(campaigns.map(c => c.id));
    }
  }

  async function loadSupabaseBeats(userId?: string) {
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) {
      setSupabaseBeats([]);
      return;
    }
    const { data } = await supabase
      .from('beats')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });
    if (data) setSupabaseBeats(data);
  }

  async function loadDriveFiles(token: string, folderId: string) {
    setLoadingDrive(true);
    setDriveError(null);
    try {
      const query = `trashed = false and '${folderId}' in parents and (mimeType contains 'audio/' or mimeType contains 'application/zip' or mimeType contains 'application/x-zip' or name contains '.mp3' or name contains '.wav' or name contains '.zip' or name contains '.rar' or mimeType = 'application/vnd.google-apps.folder')`;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,iconLink)&orderBy=folder,modifiedTime desc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) {
        console.error('Error fetching from Google Drive', data.error);
        setDriveError(data.error.message || 'Google Drive session expired or permission denied.');
        setDriveFiles([]);
      } else if (data.files) {
        setDriveFiles(data.files);
      }
    } catch (err: any) {
      console.error('Error fetching from Google Drive', err);
      setDriveError('Failed to connect to Google Drive.');
    }
    setLoadingDrive(false);
  }

  function handleDriveFolderClick(folderId: string, folderName: string) {
    const newHistory = [...driveHistory, {id: folderId, name: folderName}];
    setDriveHistory(newHistory);
    if (session?.provider_token) {
      loadDriveFiles(session.provider_token, folderId);
    }
  }

  function handleDriveBack() {
    if (driveHistory.length > 1) {
      const newHistory = driveHistory.slice(0, -1);
      setDriveHistory(newHistory);
      const parentFolderId = newHistory[newHistory.length - 1].id;
      if (session?.provider_token) {
        loadDriveFiles(session.provider_token, parentFolderId);
      }
    }
  }

  function toggleAttachment(name: string, link: string) {
    if (!link) return alert('This file does not have a valid shareable link.');
    const exists = selectedAttachments.find(a => a.link === link);
    if (exists) {
      setSelectedAttachments(selectedAttachments.filter(a => a.link !== link));
    } else {
      setSelectedAttachments([...selectedAttachments, { name, link }]);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.provider_token) {
      setStatus('Error: Session expired. Please log out and log in again.');
      return;
    }

    setSending(true);
    setStatus('Creating campaign and sending via Google API...');

    const emailList = emails.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes('@'));

    if (emailList.length === 0) {
      setStatus('Error: Please provide at least one valid email address.');
      setSending(false);
      return;
    }

    // Obtain fresh access_token for Supabase RLS authentication
    let userToken = session?.access_token;
    try {
      const { data: refreshData } = await supabase.auth.getSession();
      if (refreshData?.session?.access_token) {
        userToken = refreshData.session.access_token;
      }
    } catch {}

    try {
      const res = await fetch('/api/send-mail', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userToken ? { 'Authorization': `Bearer ${userToken}` } : {})
        },
        body: JSON.stringify({ 
          emails: emailList, 
          campaignName,
          subject, 
          message,
          attachments: selectedAttachments,
          accessToken: session.provider_token,
          userToken,
          senderEmail: session.user.email,
          userId: session.user.id
        })
      });

      if (res.ok) {
        setStatus(`Success! Sent emails to ${emailList.length} recipients.`);
        setEmails('');
        setSubject('');
        setCampaignName('');
        setMessage('');
        setSelectedAttachments([]);
      } else {
        const data = await res.json();
        setStatus(`Sending error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`Error connecting to the API server.`);
    }
    setSending(false);
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto pb-12 text-center mt-20">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-gray-500">You need to log in to access the E-mail Marketing tools.</p>
        <a href="/login?next=%2Fmailer" className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">Go to Login</a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 relative">
      {/* Animated Apple-style toast notification with undo capability */}
      {pendingDelete && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white px-5 py-3 rounded-full shadow-2xl flex items-center space-x-4 z-50 animate-in fade-in slide-in-from-bottom-5">
          <span className="text-sm font-medium">Deleted ({undoSecondsLeft}s)</span>
          <div className="w-px h-4 bg-gray-600"></div>
          <button 
            onClick={handleUndo} 
            className="text-blue-400 font-medium text-sm hover:text-blue-300 transition-colors"
          >
            Undo
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">E-mail Marketing</h2>
          <p className="text-gray-500">Send beat packs, attach beats and track who opens your emails.</p>
        </div>
        
        
      </div>

      <div className="flex border-b border-[#d2d2d7] mb-8">
        <button 
          onClick={() => setActiveTab('send')}
          className={`flex items-center pb-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'send' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}
        >
          <Mail size={18} className="mr-2" /> Send Pack
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex items-center pb-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'stats' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}
        >
          <BarChart3 size={18} className="mr-2" /> Campaign Stats
        </button>
      </div>

      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-sm">
            {!session?.provider_token ? (
              <div className="text-center py-12 text-red-600">Insufficient permissions. Please go to Account, log out, and log back in.</div>
            ) : (
              <form onSubmit={handleSend} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Users size={16} className="mr-1.5"/> Recipients (enter or comma)
                  </label>
                  <textarea 
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black min-h-[100px]"
                    placeholder="raper1@gmail.com&#10;raper2@gmail.com" 
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name (For you only)</label>
                    <input 
                      type="text" 
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                      placeholder="e.g. Spring Beat Pack 2026" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject (For recipients)</label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                      placeholder="e.g. 🔥 Exclusive Beat Pack" 
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black min-h-[160px]"
                    placeholder="Hey! Here are my latest beats..." 
                    required
                  />
                </div>
                
                {selectedAttachments.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Attachments to download ({selectedAttachments.length}):</p>
                    <ul className="space-y-1">
                      {selectedAttachments.map(att => (
                        <li key={att.link} className="text-sm text-blue-600 flex items-center">
                          <Paperclip size={14} className="mr-2" /> <span className="truncate">{att.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {status && (
                  <div className={`p-4 rounded-lg text-sm font-medium border ${status.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {status}
                  </div>
                )}

                <button type="submit" disabled={sending} className="w-full flex items-center justify-center bg-black text-white font-medium py-3 px-4 rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50">
                  <Send size={18} className="mr-2" />
                  {sending ? 'Sending...' : 'Start Sending'}
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-5">
            {session && session.provider_token && (
              <div className="bg-white border border-[#d2d2d7] rounded-xl p-0 shadow-sm flex flex-col h-[700px]">
                <div className="p-4 border-b border-[#d2d2d7]">
                  <h3 className="font-semibold text-lg flex items-center mb-4"><Paperclip size={18} className="mr-2"/> Attachments</h3>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setAttachmentSource('supabase')} className={`flex-1 flex items-center justify-center py-1.5 text-sm font-medium rounded-md transition-colors ${attachmentSource === 'supabase' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>
                      <Music2 size={16} className="mr-2" /> Beat Catalog
                    </button>
                    <button 
                      onClick={() => {
                        setAttachmentSource('drive');
                        if (session?.provider_token && driveFiles.length === 0 && !loadingDrive) {
                          loadDriveFiles(session.provider_token, driveHistory[driveHistory.length - 1].id);
                        }
                      }} 
                      className={`flex-1 flex items-center justify-center py-1.5 text-sm font-medium rounded-md transition-colors ${attachmentSource === 'drive' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                    >
                      <HardDrive size={16} className="mr-2" /> Google Drive
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {attachmentSource === 'supabase' && (
                    <div className="space-y-1">
                      {supabaseBeats.length === 0 ? <p className="text-center text-gray-500 text-sm mt-8">No beats in catalog.</p> : supabaseBeats.map(beat => {
                          const isSelected = selectedAttachments.some(a => a.link === beat.file_url);
                          return (
                            <div key={beat.id} onClick={() => toggleAttachment(beat.title, beat.file_url)} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'}`}>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>{beat.title}</p>
                              </div>
                              {isSelected ? <CheckCircle2 size={18} className="text-blue-600" /> : <div className="w-4 h-4 border-2 border-gray-300 rounded-sm" />}
                            </div>
                          )
                        })}
                    </div>
                  )}

                  {attachmentSource === 'drive' && (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center px-2 py-2 mb-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                        {driveHistory.length > 1 && (
                          <button onClick={handleDriveBack} className="p-1 hover:bg-gray-200 rounded-md mr-2">
                            <ArrowLeft size={16} />
                          </button>
                        )}
                        <span className="font-medium truncate flex-1">
                          {driveHistory[driveHistory.length - 1].name}
                        </span>
                        {session?.provider_token && (
                          <button
                            type="button"
                            onClick={() => loadDriveFiles(session.provider_token!, driveHistory[driveHistory.length - 1].id)}
                            className="text-xs text-blue-600 hover:text-blue-800 ml-2 font-medium"
                            title="Refresh folder"
                          >
                            Refresh
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 flex-1 overflow-y-auto">
                        {!session?.provider_token || driveError ? (
                          <div className="text-center py-8 px-4 flex flex-col items-center">
                            <HardDrive size={32} className="text-gray-400 mb-2" />
                            <p className="text-sm font-semibold text-gray-800 mb-1">
                              Google Drive Authorization Needed
                            </p>
                            <p className="text-xs text-gray-500 max-w-xs mb-4">
                              {driveError || 'Connect your Google Drive with read permissions to attach audio and zip files.'}
                            </p>
                            <button
                              type="button"
                              onClick={reconnectGoogleDrive}
                              className="inline-flex items-center gap-2 bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                            >
                              <HardDrive size={14} /> Connect Google Drive
                            </button>
                          </div>
                        ) : loadingDrive ? (
                          <p className="text-center text-gray-500 text-sm mt-8">Loading content...</p>
                        ) : driveFiles.length === 0 ? (
                          <div className="text-center py-8 px-4 flex flex-col items-center">
                            <p className="text-gray-500 text-sm mb-2">This folder is empty or has no audio/zip files.</p>
                            <button
                              type="button"
                              onClick={reconnectGoogleDrive}
                              className="text-xs text-blue-600 hover:underline cursor-pointer"
                            >
                              Re-authorize Google Drive &rarr;
                            </button>
                          </div>
                        ) : (
                          driveFiles.map(file => {
                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                            const isSelected = selectedAttachments.some(a => a.link === file.webViewLink);
                            
                            if (isFolder) {
                              return (
                                <div key={file.id} onClick={() => handleDriveFolderClick(file.id, file.name)} className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-transparent">
                                  <Folder size={18} className="text-gray-400 mr-3" fill="currentColor" />
                                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{file.name}</p></div>
                                </div>
                              );
                            } else {
                              return (
                                <div key={file.id} onClick={() => toggleAttachment(file.name, file.webViewLink)} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'}`}>
                                  {file.iconLink && <img src={file.iconLink} alt="icon" className="w-4 h-4 mr-3" />}
                                  <div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>{file.name}</p></div>
                                  {isSelected ? <CheckCircle2 size={18} className="text-blue-600" /> : <div className="w-4 h-4 border-2 border-gray-300 rounded-sm" />}
                                </div>
                              );
                            }
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          
          {/* Lewa kolumna: Lista Kampanii */}
          <div className="lg:col-span-1 bg-white border border-[#d2d2d7] rounded-xl shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-[#d2d2d7] bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Your Campaigns</h3>
              {campaigns.length > 0 && (
                <button onClick={toggleSelectAll} className="text-sm text-blue-600 hover:underline font-medium">
                  {selectedCampaignIds.length === campaigns.length ? 'Deselect' : 'Select all'}
                </button>
              )}
            </div>

            {/* Pasek zbiorczego usuwania */}
            {selectedCampaignIds.length > 0 && (
              <div className="bg-red-50 p-3 flex justify-between items-center border-b border-red-100">
                <span className="text-sm text-red-700 font-medium ml-1">Selected: {selectedCampaignIds.length}</span>
                <button 
                  onClick={() => initiateDeletion(selectedCampaignIds)} 
                  className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center"
                >
                  <Trash2 size={16} className="mr-1.5" /> Delete selected
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {loadingStats ? (
                <p className="text-center text-gray-500 py-8">Loading stats...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No campaigns.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {campaigns.map(camp => {
                    const logs = camp.email_logs || []; const opens = logs.filter((l: any) => l.opened).length || 0;
                    const totalSent = camp.total_sent > 0 ? camp.total_sent : logs.length; const openRate = totalSent > 0 ? Math.round((opens / totalSent) * 100) : 0;
                    const isSelected = selectedCampaign?.id === camp.id;
                    const isChecked = selectedCampaignIds.includes(camp.id);
                    
                    return (
                      <li 
                        key={camp.id} 
                        className={`flex items-stretch border-l-4 transition-colors hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-blue-600' : 'border-transparent'}`}
                      >
                        <div className="pl-4 pr-2 py-4 flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 cursor-pointer text-blue-600 rounded"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCampaignIds([...selectedCampaignIds, camp.id]);
                              else setSelectedCampaignIds(selectedCampaignIds.filter(id => id !== camp.id));
                            }}
                          />
                        </div>
                        <div className="flex-1 p-4 pl-2 cursor-pointer" onClick={() => setSelectedCampaign(camp)}>
                          <p className="font-semibold text-sm truncate text-gray-900">{camp.subject}</p>
                          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                            <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(camp.created_at).toLocaleDateString()}</span>
                            <span className="font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{openRate}% Opens</span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selectedCampaign ? (
              <div className="bg-white border border-[#d2d2d7] rounded-xl h-[700px] flex items-center justify-center text-gray-500">
                Select a campaign from the list to see who opened the email.
              </div>
            ) : (
              <div className="bg-white border border-[#d2d2d7] rounded-xl shadow-sm h-[700px] flex flex-col">
                <div className="p-6 border-b border-[#d2d2d7] flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedCampaign.subject}</h2>
                    <div className="flex space-x-6 text-sm text-gray-600">
                      <span className="flex items-center"><Calendar size={16} className="mr-1.5"/> Sent: {new Date(selectedCampaign.created_at).toLocaleString()}</span>
                      <span className="flex items-center"><Users size={16} className="mr-1.5"/> Recipients: {selectedCampaign.total_sent}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => initiateDeletion([selectedCampaign.id])}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center text-sm font-medium"
                  >
                    <Trash2 size={18} className="mr-1.5" /> Delete stats
                  </button>
                </div>

                <div className="p-6 bg-gray-50 border-b border-[#d2d2d7] flex space-x-8">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">Emails Sent</p>
                    <p className="text-3xl font-bold text-gray-900">{selectedCampaign.total_sent}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">Opened</p>
                    <p className="text-3xl font-bold text-green-600">{selectedCampaign.email_logs?.filter((l: any) => l.opened).length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">Open Rate</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {selectedCampaign.total_sent > 0 ? Math.round(((selectedCampaign.email_logs?.filter((l: any) => l.opened).length || 0) / selectedCampaign.total_sent) * 100) : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email Address</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Opened At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {selectedCampaign.email_logs?.map((log: any) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.recipient_email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {log.opened ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Eye size={12} className="mr-1"/> Read
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Not opened
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.opened && log.opened_at ? new Date(log.opened_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmIds && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {deleteConfirmIds.length > 1 
                  ? `Delete ${deleteConfirmIds.length} campaigns?` 
                  : 'Delete this campaign?'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to do this? This will delete the selected campaigns and all email open logs.
              </p>
              <div className="flex space-x-3 w-full">
                <button 
                  onClick={() => setDeleteConfirmIds(null)} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDeletion} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                >
                  Yes, delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
