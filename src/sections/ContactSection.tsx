import { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, User, MessageSquare, CloudDownload, Github, Twitter, Globe } from 'lucide-react';
import { submitContact } from '../lib/api';

export default function ContactSection() {
  const [form, setForm] = useState({ name:'', email:'', message:'' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.name||!form.email||!form.message) { setError('Please fill in all fields.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      await submitContact(form.name, form.email, form.message);
      setSuccess(true);
      setForm({ name:'', email:'', message:'' });
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="text-center mb-12 animate-on-scroll">
        <h2 className="text-4xl font-extrabold text-white mb-4">Get in <span className="text-gradient-sky">Touch</span></h2>
        <p className="text-slate-400 max-w-lg mx-auto">Have a question, bug report, or feature request? We'd love to hear from you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="glass-card p-8 animate-on-scroll">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Mail size={20} className="text-[#38BDF8]"/>Send a Message</h3>

          {success ? (
            <div className="text-center py-12">
              <CheckCircle size={52} className="text-emerald-400 mx-auto mb-4"/>
              <h4 className="text-white font-bold text-xl mb-2">Message Sent!</h4>
              <p className="text-slate-400 text-sm mb-6">Thanks for reaching out. The BitBase team will get back to you soon.</p>
              <button onClick={()=>setSuccess(false)} className="btn-primary-glow px-6 py-3 rounded-xl cursor-pointer text-sm">Send Another</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 flex items-center gap-2"><User size={13}/>Your Name</label>
                <input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                  placeholder="Ahmed Khan" className="w-full px-4 py-3 input-glow text-sm" disabled={loading}/>
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-2 flex items-center gap-2"><Mail size={13}/>Email Address</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                  placeholder="ahmed@example.com" className="w-full px-4 py-3 input-glow text-sm" disabled={loading}/>
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-2 flex items-center gap-2"><MessageSquare size={13}/>Message</label>
                <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})}
                  placeholder="Tell us what's on your mind..." rows={5}
                  className="w-full px-4 py-3 input-glow text-sm resize-none" disabled={loading}/>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}>
                  <AlertCircle size={13}/>{error}
                </div>
              )}
              <button onClick={handleSubmit} disabled={loading}
                className="w-full btn-primary-glow py-3.5 flex items-center justify-center gap-3 text-base cursor-pointer disabled:opacity-70">
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Sending...</> : <><Send size={16}/>Send Message</>}
              </button>
            </div>
          )}
        </div>

        {/* About + Links */}
        <div className="space-y-6 animate-on-scroll">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <CloudDownload size={28} className="text-[#38BDF8]"/>
              <div>
                <h3 className="text-white font-bold text-lg">BitBase Downloader</h3>
                <p className="text-slate-500 text-sm">Provided by the BitBase Team</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              BitBase is a free, open-source video downloader built for everyone. We believe content you watch should be yours to keep. No ads, no limits, no nonsense.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Powered by <span className="text-[#38BDF8] font-semibold">yt-dlp</span>, the world's most powerful media downloader, BitBase gives it a clean, modern interface anyone can use.
            </p>
          </div>

          <div className="glass-card p-6">
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <div className="space-y-3">
              {[
                { icon:Globe, label:'Website', value:'bitbase.demo', href:'#' },
                { icon:Github, label:'GitHub', value:'github.com/Ahmed77', href:'#' },
                { icon:Twitter, label:'Twitter', value:'@lunaxyzee', href:'#' },
                { icon:Mail, label:'Email', value:'bitbase75@gmail.com', href:'mailto:bitbase75@gmail.com' },
              ].map(({ icon:Icon, label, value, href })=>(
                <a key={label} href={href} className="flex items-center gap-3 text-sm text-slate-400 hover:text-[#38BDF8] transition-colors">
                  <Icon size={15} className="text-[#38BDF8] flex-shrink-0"/>
                  <span className="text-slate-500 w-16">{label}</span>
                  <span>{value}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="text-white font-semibold mb-3">Privacy Policy</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              BitBase does <span className="text-white font-medium">not</span> collect, store, or share any personal data. We don't track your downloads, browsing, or behavior. No cookies, no analytics, no third-party trackers.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mt-3">
              Download history is stored <span className="text-white font-medium">only in your browser's local storage</span> and never sent to our servers. Contact form messages are stored locally on our server only to allow us to reply.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 pb-8 animate-on-scroll">
        <div className="flex items-center justify-center gap-3 mb-4">
          <CloudDownload size={20} className="text-[#38BDF8]"/>
          <span className="text-white font-bold">BitBase Downloader</span>
        </div>
        <p className="text-slate-500 text-sm mb-4">© {new Date().getFullYear()} BitBase Team. All rights reserved.</p>
        <div className="flex justify-center gap-6">
          {['Privacy Policy','Terms of Service','Contact','GitHub'].map(l=><a key={l} href="#" className="text-slate-500 text-xs hover:text-[#38BDF8] transition-colors">{l}</a>)}
        </div>
      </div>
    </div>
  );
}
