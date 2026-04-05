import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [step, setStep] = useState('welcome');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phone.length > 5) setStep('code');
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (code.length >= 4) navigate('/feed');
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--jamii-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--jamii-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 36, color: '#fff',
          margin: '0 auto 16px',
          boxShadow: '0 0 0 16px rgba(42,171,238,0.08)',
        }}>J</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Jamii</h1>
        <div style={{ color: 'var(--jamii-text-muted)', fontSize: 14 }}>by BlusceLabs</div>
      </div>

      {step === 'welcome' && (
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Welcome to Jamii</h2>
          <p style={{ color: 'var(--jamii-text-muted)', marginBottom: 36, fontSize: 15, lineHeight: 1.6 }}>
            Message, connect and share — all in one place.
          </p>
          <button onClick={() => setStep('phone')} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: 'var(--jamii-blue)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            marginBottom: 12,
          }}>Get Started</button>
          <button onClick={() => navigate('/feed')} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: 'var(--jamii-surface)', color: 'var(--jamii-text)',
            border: '1px solid var(--jamii-border)', fontWeight: 600, fontSize: 16, cursor: 'pointer',
          }}>Continue as Guest</button>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Your phone number</h2>
          <p style={{ color: 'var(--jamii-text-muted)', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
            We'll send a verification code to confirm it's you.
          </p>
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoFocus
            style={{
              width: '100%', background: 'var(--jamii-surface-2)',
              border: '1.5px solid var(--jamii-border)', borderRadius: 14,
              padding: '14px 18px', color: 'var(--jamii-text)',
              fontSize: 17, outline: 'none', boxSizing: 'border-box',
              marginBottom: 16,
            }}
          />
          <button type="submit" style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: phone.length > 5 ? 'var(--jamii-blue)' : 'rgba(42,171,238,0.35)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            marginBottom: 12,
          }}>Send Code</button>
          <button type="button" onClick={() => setStep('welcome')} style={{
            width: '100%', padding: '12px', background: 'none',
            border: 'none', color: 'var(--jamii-text-muted)', cursor: 'pointer', fontSize: 14,
          }}>← Back</button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleCodeSubmit} style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Enter the code</h2>
          <p style={{ color: 'var(--jamii-text-muted)', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
            We sent a 5-digit code to {phone}
          </p>
          <input
            type="text"
            placeholder="- - - - -"
            value={code}
            onChange={e => setCode(e.target.value.slice(0, 5))}
            autoFocus
            style={{
              width: '100%', background: 'var(--jamii-surface-2)',
              border: '1.5px solid var(--jamii-border)', borderRadius: 14,
              padding: '16px 18px', color: 'var(--jamii-text)',
              fontSize: 28, outline: 'none', boxSizing: 'border-box',
              marginBottom: 16, textAlign: 'center', letterSpacing: 12, fontWeight: 700,
            }}
          />
          <button type="submit" style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: code.length >= 4 ? 'var(--jamii-blue)' : 'rgba(42,171,238,0.35)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            marginBottom: 12,
          }}>Verify & Enter Jamii</button>
          <button type="button" onClick={() => setStep('phone')} style={{
            width: '100%', padding: '12px', background: 'none',
            border: 'none', color: 'var(--jamii-text-muted)', cursor: 'pointer', fontSize: 14,
          }}>← Resend code</button>
        </form>
      )}

      <p style={{ color: 'var(--jamii-text-muted)', fontSize: 12, textAlign: 'center', marginTop: 40, maxWidth: 320, lineHeight: 1.6 }}>
        By continuing, you agree to Jamii's Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
