import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, 
  Moon, 
  Coffee, 
  Utensils, 
  Briefcase, 
  Heart, 
  User, 
  Clock, 
  Bell, 
  Settings, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Volume2,
  VolumeX,
  Mic,
  Square,
  Play,
  Edit2,
  Save,
  Wind,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_SCHEDULE } from './constants';
import { ScheduleItem } from './types';

const IconMap: Record<string, any> = {
  Sun,
  Moon,
  Coffee,
  Utensils,
  Briefcase,
  Heart,
  User,
};

const SOUNDS = [
  { id: 'chime', name: 'Gentle Chime', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
  { id: 'bell', name: 'Soft Bell', url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
  { id: 'zen', name: 'Zen Bowl', url: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3' },
  { id: 'nature', name: 'Bird Chirp', url: 'https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3' },
];

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('aura_schedule');
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE;
  });
  const [selectedSound, setSelectedSound] = useState(() => {
    return localStorage.getItem('avni_sound') || 'chime';
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('avni_muted') === 'true';
  });
  const [customVoiceUrl, setCustomVoiceUrl] = useState<string | null>(() => {
    return localStorage.getItem('avni_custom_voice') || null;
  });
  const [activeReminder, setActiveReminder] = useState<ScheduleItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isStressBreakActive, setIsStressBreakActive] = useState(false);
  const [breakTimer, setBreakTimer] = useState(300); // 5 minutes in seconds
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Save sound settings
  useEffect(() => {
    localStorage.setItem('avni_sound', selectedSound);
    localStorage.setItem('avni_muted', String(isMuted));
    if (customVoiceUrl) {
      localStorage.setItem('avni_custom_voice', customVoiceUrl);
    }
  }, [selectedSound, isMuted, customVoiceUrl]);

  const playNotification = () => {
    if (isMuted) return;
    
    let url = '';
    if (selectedSound === 'custom' && customVoiceUrl) {
      url = customVoiceUrl;
    } else {
      const sound = SOUNDS.find(s => s.id === selectedSound);
      if (sound) url = sound.url;
    }

    if (url) {
      const audio = new Audio(url);
      audio.play().catch(e => console.error("Audio playback failed:", e));
    }
  };

  // Recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setCustomVoiceUrl(base64data);
          setSelectedSound('custom');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to record voice.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 10) { // Limit to 10 seconds
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      checkReminders(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [schedule]);

  // Save schedule to local storage
  useEffect(() => {
    localStorage.setItem('aura_schedule', JSON.stringify(schedule));
  }, [schedule]);

  // Break timer logic
  useEffect(() => {
    let interval: any;
    if (isStressBreakActive && breakTimer > 0) {
      interval = setInterval(() => {
        setBreakTimer((prev) => prev - 1);
      }, 1000);
    } else if (breakTimer === 0) {
      setIsStressBreakActive(false);
      setBreakTimer(300);
    }
    return () => clearInterval(interval);
  }, [isStressBreakActive, breakTimer]);

  const checkReminders = (now: Date) => {
    const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const seconds = now.getSeconds();

    // Only trigger at the start of the minute
    if (seconds === 0) {
      const reminder = schedule.find(item => item.enabled && item.time === currentHM);
      if (reminder) {
        setActiveReminder(reminder);
        playNotification();
      }
    }
  };

  const toggleReminder = (id: string) => {
    setSchedule(prev => prev.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  };

  const updateScheduleItem = (id: string, updates: Partial<ScheduleItem>) => {
    setSchedule(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const startStressBreak = () => {
    setIsStressBreakActive(true);
    setBreakTimer(300);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const sortedSchedule = useMemo(() => {
    return [...schedule].sort((a, b) => a.time.localeCompare(b.time));
  }, [schedule]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif italic text-stone-800 mb-2">Avni</h1>
          <p className="text-stone-500 font-medium tracking-wide uppercase text-[10px]">Your Mindful Assistant</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-3 justify-end mb-2">
            <div className="flex items-center gap-2">
              {isRecording ? (
                <motion.button 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  onClick={stopRecording}
                  className="p-1.5 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Square size={12} fill="currentColor" />
                  <span className="text-[10px] font-mono">{recordingTime}s</span>
                </motion.button>
              ) : (
                <button 
                  onClick={startRecording}
                  title="Record custom voice"
                  className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-50 rounded-full transition-colors"
                >
                  <Mic size={16} />
                </button>
              )}
            </div>

            <select 
              value={selectedSound}
              onChange={(e) => {
                setSelectedSound(e.target.value);
                // Preview sound
                if (e.target.value === 'custom' && customVoiceUrl) {
                  new Audio(customVoiceUrl).play();
                } else {
                  const sound = SOUNDS.find(s => s.id === e.target.value);
                  if (sound) new Audio(sound.url).play();
                }
              }}
              className="text-[10px] uppercase tracking-wider text-stone-400 bg-transparent border-none outline-none cursor-pointer hover:text-stone-600"
            >
              {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              {customVoiceUrl && <option value="custom">My Recording</option>}
            </select>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
          <div className="text-3xl font-light tracking-tight text-stone-800">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-stone-400 text-xs">
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Stress Break Section */}
      <section className="mb-12">
        <div className="glass rounded-3xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-serif text-stone-800 mb-2">Feeling Stressed?</h2>
            <p className="text-stone-500 text-sm mb-6">Take a 5-minute mindful break to reset your focus.</p>
            
            {!isStressBreakActive ? (
              <button 
                onClick={startStressBreak}
                className="bg-stone-800 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-stone-700 transition-colors flex items-center gap-2"
              >
                <Wind size={18} />
                Start 5-min Break
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-4xl font-light text-stone-800 tabular-nums">
                  {formatTime(breakTimer)}
                </div>
                <button 
                  onClick={() => setIsStressBreakActive(false)}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
          
          {/* Decorative background element */}
          <motion.div 
            animate={isStressBreakActive ? { scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-10 -bottom-10 w-40 h-40 bg-stone-200 rounded-full blur-3xl opacity-10"
          />
        </div>
      </section>

      {/* Schedule List */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Daily Schedule</h2>
          <button className="text-stone-400 hover:text-stone-800 transition-colors">
            <Settings size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {sortedSchedule.map((item) => {
            const Icon = IconMap[item.icon] || Bell;
            const isEditing = editingId === item.id;

            return (
              <motion.div 
                key={item.id}
                layout
                className={`flex items-start gap-4 p-4 rounded-2xl transition-all ${
                  item.enabled ? 'bg-white shadow-sm border border-stone-100' : 'opacity-50 grayscale'
                } ${isEditing ? 'ring-2 ring-stone-800 ring-inset' : ''}`}
              >
                <div className={`p-3 rounded-xl mt-1 ${item.enabled ? 'bg-stone-50 text-stone-800' : 'bg-stone-100 text-stone-400'}`}>
                  <Icon size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={item.label}
                          onChange={(e) => updateScheduleItem(item.id, { label: e.target.value })}
                          className="flex-1 font-medium text-stone-800 bg-stone-50 rounded px-2 py-1 outline-none focus:bg-stone-100"
                          placeholder="Label"
                        />
                        <input 
                          type="time"
                          value={item.time}
                          onChange={(e) => updateScheduleItem(item.id, { time: e.target.value })}
                          className="text-sm font-light text-stone-500 bg-stone-50 rounded px-2 py-1 outline-none focus:bg-stone-100 tabular-nums"
                        />
                      </div>
                      <textarea 
                        value={item.message}
                        onChange={(e) => updateScheduleItem(item.id, { message: e.target.value })}
                        className="w-full text-xs text-stone-500 bg-stone-50 rounded px-2 py-1 outline-none focus:bg-stone-100 resize-none"
                        rows={2}
                        placeholder="Message"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium text-stone-800 truncate pr-2">{item.label}</h3>
                        <span className="text-sm font-light text-stone-500 tabular-nums shrink-0">{item.time}</span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{item.message}</p>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-3 items-center shrink-0">
                  <button 
                    onClick={() => toggleReminder(item.id)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      item.enabled ? 'bg-stone-800' : 'bg-stone-200'
                    }`}
                  >
                    <motion.div 
                      animate={{ x: item.enabled ? 20 : 4 }}
                      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                  
                  <button 
                    onClick={() => setEditingId(isEditing ? null : item.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isEditing ? 'bg-stone-800 text-white' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
                    }`}
                  >
                    {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Active Reminder Modal */}
      <AnimatePresence>
        {activeReminder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-stone-800">
                {React.createElement(IconMap[activeReminder.icon] || Bell, { size: 32 })}
              </div>
              
              <h2 className="text-2xl font-serif italic text-stone-800 mb-4">{activeReminder.label}</h2>
              <p className="text-stone-600 leading-relaxed mb-8">
                {activeReminder.message}
              </p>
              
              <button 
                onClick={() => setActiveReminder(null)}
                className="w-full bg-stone-800 text-white py-4 rounded-2xl font-medium hover:bg-stone-700 transition-colors"
              >
                Got it, Avni
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Quick Actions */}
      <footer className="mt-12 text-center">
        <p className="text-stone-400 text-xs italic">"The secret of your future is hidden in your daily routine."</p>
      </footer>
    </div>
  );
}
