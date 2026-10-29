import { useCallback, useEffect, useRef, useState } from 'react';
import { ScanBarcode, Camera, ImageUp, Keyboard, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import CameraView from './Camera';
import Illustration from './Illustrations';
import discoveries from '../content/discoveries.json';
import { PRODUCT_TYPES, prepareImage } from '../lib';
import { isBarcode, readBarcode } from '../barcode';

const STEPS = ['Reading the small print…', 'Interrogating the preservatives…', 'Asking the sugar to explain itself…', 'Checking it against you…', 'Writing the verdict…'];

// Phones and tablets use their own camera app (a capture file input): it works in every
// mobile browser, including iOS Brave/Chrome/Firefox, which can't stream the camera to
// websites. The in-page live camera is only used on laptops and desktops.
const USE_NATIVE_CAMERA = window.matchMedia('(pointer: coarse)').matches
  || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as a Mac

export default function Scan({ profile, onResult, initialMode = 'photo' }) {
  const [mode, setMode] = useState(initialMode);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [fact, setFact] = useState(() => Math.floor(Math.random() * discoveries.length));
  const captureRef = useRef(null);
  const abortRef = useRef(null);
  const [productType, setProductType] = useState(profile.defaultType || 'Food');
  const [productName, setProductName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeBusy, setBarcodeBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (!loading) return;
    const steps = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 4000);
    const facts = setInterval(() => setFact(f => (f + 1) % discoveries.length), 7000);
    return () => { clearInterval(steps); clearInterval(facts); };
  }, [loading]);

  const pickFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose a photo (JPEG or PNG).'); return; }
    try {
      setError('');
      setImage(await prepareImage(file));
    } catch (e) {
      setError(e.message);
    }
  };

  // Barcode: read the number from a photo (or typed), look it up, then check its ingredients.
  const lookup = async (code) => {
    if (!isBarcode(code)) { setError('A barcode is 8 to 14 digits, found under the stripes.'); return; }
    setError('');
    setNotice(null);
    setBarcodeBusy('Looking it up…');
    try {
      const res = await fetch(`/api/barcode?code=${code}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Lookup failed. Try again.');
      setBarcodeBusy('');
      if (data.found && data.ingredients) {
        setProductName(data.productName || '');
        setProductType(data.productType);
        analyze(data);
      } else {
        if (data.productName) setProductName(data.productName);
        if (data.productType) setProductType(data.productType);
        setNotice(data.found
          ? `Found ${data.productName || 'it'}, but nobody has added its ingredients yet.`
          : 'Not in the database yet. Even the barcode is keeping secrets.');
      }
    } catch (e) {
      setBarcodeBusy('');
      setError(e.message === 'Failed to fetch' ? 'No connection. Try again.' : e.message);
    }
  };

  const pickBarcodePhoto = async (file) => {
    if (!file) return;
    setError('');
    setNotice(null);
    setBarcodeBusy('Reading the barcode…');
    try {
      const code = await readBarcode(file);
      if (!code) {
        setBarcodeBusy('');
        setError('Couldn’t read a barcode. Get closer, hold steady, or type the number.');
        return;
      }
      setBarcode(code);
      await lookup(code);
    } catch {
      setBarcodeBusy('');
      setError('Couldn’t read that photo. Try again or type the number.');
    }
  };

  // No live camera (old browser, desktop without webcam): use the phone's own camera app.
  const cameraUnavailable = useCallback(() => {
    setCameraOpen(false);
    captureRef.current?.click();
  }, []);

  // `found` is a barcode lookup result: its ingredient list is checked like typed text.
  const analyze = async (found = null) => {
    if (!found && mode === 'text' && !ingredients.trim()) { setError('Add ingredients first.'); return; }
    if (!found && mode === 'photo' && !image) { setError('Add a photo first.'); return; }

    setError('');
    setStep(0);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const body = found
        ? { productType: found.productType, productName: found.productName || '', profile, ingredients: found.ingredients }
        : { productType, productName, profile };
      if (!found && mode === 'photo') body.image = { mediaType: image.mediaType, data: image.base64 };
      else if (!found) body.ingredients = ingredients;

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `The server returned an error (${res.status}).`);

      onResult({
        ...data,
        scannedAt: new Date().toISOString(),
        ...(found ? { barcode: found.code, source: found.source, thumb: found.image || undefined } : {}),
        ...(!found && mode === 'photo' ? { preview: image.preview, thumb: image.thumb } : {}),
      });
    } catch (e) {
      setLoading(false);
      if (e.name === 'AbortError') return;
      setError(e.message === 'Failed to fetch' ? 'No connection. Try again.' : e.message);
    }
  };

  return (
    <div className="screen">
      <h1 className="h1"><span className="tone-orange">Check</span> a label</h1>

      <div className="seg" role="tablist" aria-label="How to add ingredients">
        <button role="tab" aria-selected={mode === 'photo'} className={mode === 'photo' ? 'is-active' : ''} onClick={() => setMode('photo')}>
          <Camera size={17} /> Photo
        </button>
        <button role="tab" aria-selected={mode === 'barcode'} className={mode === 'barcode' ? 'is-active' : ''} onClick={() => { setMode('barcode'); setError(''); }}>
          <ScanBarcode size={17} /> Barcode
        </button>
        <button role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'is-active' : ''} onClick={() => setMode('text')}>
          <Keyboard size={17} /> Type
        </button>
      </div>

      {mode === 'barcode' ? (
        <div className="drop">
          <span className="drop__title">Scan the barcode</span>
          <span className="drop__hint">We’ll find the ingredients for you.</span>
          <div className="drop__actions">
            <button className="btn btn--primary" onClick={() => barcodeRef.current?.click()} disabled={!!barcodeBusy}>
              <Camera size={18} /> Snap barcode
            </button>
          </div>
          <form
            className="barcode-entry"
            onSubmit={e => { e.preventDefault(); lookup(barcode.trim()); }}
          >
            <input
              className="input input--white"
              inputMode="numeric"
              pattern="[0-9]*"
              value={barcode}
              onChange={e => setBarcode(e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder="Or type the number"
              aria-label="Barcode number"
            />
            <button className="btn btn--ghost" type="submit" disabled={!!barcodeBusy || barcode.length < 8}>Look up</button>
          </form>
          {barcodeBusy && <p className="barcode-busy"><LoaderCircle size={16} className="spin" /> {barcodeBusy}</p>}
        </div>
      ) : mode === 'photo' ? (
        image ? (
          <div className="photo">
            <img src={image.preview} alt="Ingredient label to check" />
            <button className="photo__remove" onClick={() => setImage(null)} aria-label="Remove photo"><X size={16} /></button>
          </div>
        ) : (
          <div
            className="drop"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
          >
            <span className="drop__title">Snap the label</span>
            <span className="drop__hint">Whole list, good light.</span>
            <div className="drop__actions">
              <button className="btn btn--primary" onClick={() => (USE_NATIVE_CAMERA ? captureRef.current?.click() : setCameraOpen(true))}>
                <Camera size={18} /> Take photo
              </button>
              <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}><ImageUp size={18} /> Gallery</button>
            </div>
          </div>
        )
      ) : (
        <label className="field">
          <span className="label">Ingredient list</span>
          <textarea
            className="input"
            rows={7}
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
            placeholder="Water, sugar, citric acid, sodium benzoate, natural flavours…"
          />
        </label>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { pickFile(e.target.files[0]); e.target.value = ''; }} />
      <input ref={captureRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { pickFile(e.target.files[0]); e.target.value = ''; }} />
      <input ref={barcodeRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { pickBarcodePhoto(e.target.files[0]); e.target.value = ''; }} />
      {cameraOpen && (
        <CameraView
          onCapture={file => { setCameraOpen(false); pickFile(file); }}
          onClose={() => setCameraOpen(false)}
          onUnavailable={cameraUnavailable}
        />
      )}

      {mode !== 'barcode' && <div className="field-row">
        <label className="field">
          <span className="label">Product type</span>
          <select className="input" value={productType} onChange={e => setProductType(e.target.value)}>
            {PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Name <span className="label__opt">optional</span></span>
          <input className="input" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Wai Wai" />
        </label>
      </div>}

      <p className="profile-note">
        Checking for <b>{profile.type}</b>
        {profile.allergies.length > 0 && <> · allergic to {profile.allergies.join(', ').toLowerCase()}</>}
      </p>

      {error && (
        <div className="alert" role="alert">
          <TriangleAlert size={18} />
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div className="notice" role="status">
          <p>{notice}</p>
          <button className="btn btn--primary" onClick={() => { setNotice(null); setMode('photo'); }}>
            <Camera size={18} /> Snap the ingredients
          </button>
        </div>
      )}

      {mode !== 'barcode' && (
        <button className="btn btn--primary btn--block btn--big" onClick={() => analyze()} disabled={loading}>Check</button>
      )}

      {loading && (
        <div className="analyzing" role="dialog" aria-modal="true" aria-label="Checking ingredients">
          <div className="analyzing__card">
            <p className="analyzing__status" aria-live="polite">
              <LoaderCircle size={20} className="spin" /> {STEPS[step]}
            </p>
            <div className="analyzing__bar"><span /></div>

            <div className="analyzing__fact" key={discoveries[fact].id}>
              <Illustration name={discoveries[fact].visual} className="analyzing__art" />
              <p className="eyebrow">While you wait</p>
              <p className="analyzing__headline">{discoveries[fact].headline}</p>
            </div>

            <button className="btn btn--ghost btn--block" onClick={() => abortRef.current?.abort()}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
