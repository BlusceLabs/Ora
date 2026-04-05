import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phone.length > 5) setStep(2);
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (code.length >= 4) navigate('/chats');
  };

  return (
    <div className="flex-center" style={{ width: '100%', height: '100%', background: 'var(--jamii-bg)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✈️</div>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>Jamii by BlusceLabs</h1>
        <p style={{ color: 'var(--jamii-text-muted)', marginBottom: 32 }}>
          {step === 1 ? 'Please confirm your country code and enter your phone number.' : 'Enter the code we just sent you.'}
        </p>

        {step === 1 ? (
          <form onSubmit={handlePhoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input 
              type="tel" 
              className="input-base" 
              placeholder="Phone Number" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary">Continue</button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input 
              type="text" 
              className="input-base" 
              placeholder="Code" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary">Verify Code</button>
          </form>
        )}
      </div>
    </div>
  );
}
