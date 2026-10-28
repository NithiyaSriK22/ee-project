import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskSession } from '../registration/hooks/useKioskSession';
import { documentsApi } from '../documents/api/documents.api';
import {
  DocumentType,
  DocumentTypes,
  DocumentTypeLabels,
  UploadedDocumentItem,
  DocumentUploadResponse,
} from '../documents/types/documents.types';
import { SupportedLanguage } from '../registration/types/registration.types';
import {
  Smartphone,
  Upload,
  Camera,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  LogOut,
  ArrowRight,
  HeartHandshake,
} from 'lucide-react';

export const RemotePatientPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, patient, isSessionActive, startSession, endSession } = useKioskSession();

  // Authentication Mode: 'returning' | 'new'
  const [authMode, setAuthMode] = useState<'returning' | 'new'>('returning');

  // Form Fields
  const [uhid, setUhid] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>('en');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState<boolean>(false);

  // Document Upload States
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>(DocumentTypes.PRESCRIPTION);
  const [scanDate, setScanDate] = useState<string>('');
  const [scanType, setScanType] = useState<string>('');
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{
    fileBase64: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    previewUrl?: string;
  } | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [latestUploadResult, setLatestUploadResult] = useState<DocumentUploadResponse | null>(null);

  // Active Visit Documents List
  const [documents, setDocuments] = useState<UploadedDocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load documents when session is active
  useEffect(() => {
    if (isSessionActive && session?.visitId) {
      loadDocuments();
    }
  }, [isSessionActive, session?.visitId]);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const docs = await documentsApi.listVisitDocuments();
      setDocuments(docs || []);
    } catch (err: any) {
      console.warn('Failed to load visit documents:', err?.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Handlers for Authentication
  const handleReturningLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uhid.trim()) {
      setAuthError('Please enter your Hospital Registration Number (UHID).');
      return;
    }

    try {
      setSubmittingAuth(true);
      setAuthError(null);
      await startSession({
        hospitalRegistrationNumber: uhid.trim(),
        consentGranted: true,
        consentGrantedVia: 'patient',
      });
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to authenticate patient. Please verify your UHID.');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleNewRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !contactNumber.trim() || !age.trim()) {
      setAuthError('Please fill in your name, contact number, and age.');
      return;
    }

    const numAge = parseInt(age, 10);
    if (isNaN(numAge) || numAge < 0 || numAge > 125) {
      setAuthError('Please enter a valid age between 0 and 125.');
      return;
    }

    try {
      setSubmittingAuth(true);
      setAuthError(null);
      await startSession({
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        age: numAge,
        gender,
        preferredLanguage,
        consentGranted: true,
        consentGrantedVia: 'patient',
      });
    } catch (err: any) {
      setAuthError(err?.message || 'Registration failed. Please check your details.');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleDemoFill = () => {
    setUhid('REG-20261023-0001');
    setAuthError(null);
  };

  // File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds maximum permitted limit of 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const preview = file.type.startsWith('image/') ? result : undefined;

      setSelectedFile({
        fileBase64: base64Data,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        sizeBytes: file.size,
        previewUrl: preview,
      });
      setUploadError(null);
      setLatestUploadResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocument = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadError(null);

      const res = await documentsApi.uploadDocument({
        fileBase64: selectedFile.fileBase64,
        fileName: selectedFile.fileName,
        mimeType: selectedFile.mimeType,
        documentType: selectedDocType,
        scanDate: scanDate || null,
        scanType: scanType || null,
        doctorNotes: doctorNotes || null,
      });

      setLatestUploadResult(res);
      setSelectedFile(null);
      setScanDate('');
      setScanType('');
      setDoctorNotes('');
      // Refresh list
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload and digitize document.');
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. UNAUTHENTICATED STATE: LOGIN / QUICK REGISTRATION
  // ---------------------------------------------------------------------------
  if (!isSessionActive) {
    return (
      <div className="flex-1 flex flex-col justify-center space-y-5 py-2">
        {/* Welcome Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
            <Smartphone className="w-3.5 h-3.5 text-teal-700" />
            <span>Mobile Patient Intake & Document Upload</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Patient Portal Entry
          </h1>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Log in with your hospital registration number or create a quick visit intake to upload your medical documents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-200/80 p-1 rounded-xl flex max-w-md mx-auto w-full text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('returning');
              setAuthError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              authMode === 'returning'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Returning Patient (UHID)
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('new');
              setAuthError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              authMode === 'new'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New Patient Registration
          </button>
        </div>

        {/* Error Notification */}
        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 max-w-md mx-auto w-full">
          {authMode === 'returning' ? (
            <form onSubmit={handleReturningLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hospital Registration Number (UHID):
                </label>
                <input
                  type="text"
                  value={uhid}
                  onChange={(e) => setUhid(e.target.value)}
                  placeholder="e.g. REG-20261023-0001"
                  className="w-full text-sm font-mono p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:border-teal-600 uppercase"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Fast OPD Testing:</span>
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="text-teal-700 font-bold hover:underline"
                >
                  Use Demo UHID
                </button>
              </div>

              <button
                type="submit"
                disabled={submittingAuth}
                className="w-full min-h-[48px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 text-sm"
              >
                {submittingAuth ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying UHID...</span>
                  </>
                ) : (
                  <>
                    <span>Access Patient Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNewRegistration} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name:</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Patient Full Name"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone:</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years):</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 38"
                    min="0"
                    max="125"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender:</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600 bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Language:</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-600 bg-white"
                  >
                    <option value="en">English</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-[11px] text-teal-900 flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                <span>By continuing, you grant consent for medical document digitization and doctor assistance.</span>
              </div>

              <button
                type="submit"
                disabled={submittingAuth}
                className="w-full min-h-[48px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 text-sm mt-2"
              >
                {submittingAuth ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registering Patient...</span>
                  </>
                ) : (
                  <>
                    <span>Create Visit & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Back to Kiosk Terminal Link */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium hover:underline"
          >
            ← Return to Main Kiosk Terminal
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATED STATE: ACTIVE PATIENT UPLOAD & INTAKE PORTAL
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col space-y-4 py-2">
      {/* Patient Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {patient?.fullName ? patient.fullName.charAt(0).toUpperCase() : 'PT'}
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 leading-snug">
              {patient?.fullName || 'Registered Patient'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span>UHID: <strong>{patient?.hospitalRegistrationNumber}</strong></span>
              {patient?.age && <span>• {patient.age}y</span>}
              {patient?.gender && <span>• {patient.gender}</span>}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            await endSession();
            navigate('/portal');
          }}
          className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1"
          title="Sign out from this device"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>
      </div>

      {/* Upload New Medical Document Section */}
      <div className="bg-white rounded-2xl border border-teal-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-700" />
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Upload Medical Document
            </h3>
          </div>
          <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-bold border border-teal-200">
            OCR Digitization Active
          </span>
        </div>

        {/* Document Category Picker */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
            Select Document Category:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {Object.values(DocumentTypes).map((type) => {
              const info = DocumentTypeLabels[type];
              const isSelected = selectedDocType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedDocType(type)}
                  className={`p-2 rounded-xl text-left border transition-all text-xs font-semibold ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate">{info.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conditional Metadata for Scans & Reports */}
        {(selectedDocType === DocumentTypes.ULTRASOUND ||
          selectedDocType === DocumentTypes.XRAY_CT_MRI ||
          selectedDocType === DocumentTypes.LAB_REPORT ||
          selectedDocType === DocumentTypes.CLINICAL_NOTES) && (
          <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-900">
                Details for {DocumentTypeLabels[selectedDocType]?.label}
              </span>
              {(selectedDocType === DocumentTypes.ULTRASOUND ||
                selectedDocType === DocumentTypes.XRAY_CT_MRI) && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-300">
                  Doctor Visual Inspection
                </span>
              )}
            </div>

            {(selectedDocType === DocumentTypes.ULTRASOUND ||
              selectedDocType === DocumentTypes.XRAY_CT_MRI) && (
              <p className="text-[11px] text-teal-800 leading-snug">
                <strong>Notice:</strong> High-resolution original images are delivered directly to the doctor's review queue. Ordinary text OCR is bypassed to prevent incorrect interpretations.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  {selectedDocType === DocumentTypes.LAB_REPORT ? 'Report Date:' : 'Scan Date:'}
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={scanDate}
                  onChange={(e) => setScanDate(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  {selectedDocType === DocumentTypes.LAB_REPORT ? 'Test Name:' : 'Scan Type:'}
                </label>
                <input
                  type="text"
                  placeholder={
                    selectedDocType === DocumentTypes.ULTRASOUND
                      ? 'e.g. Abdominal, Pelvic'
                      : selectedDocType === DocumentTypes.XRAY_CT_MRI
                      ? 'e.g. Chest X-Ray, Brain MRI'
                      : 'e.g. CBC, Lipid Profile'
                  }
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Optional Notes for Doctor:
              </label>
              <input
                type="text"
                placeholder="Symptoms, reason for test, or specific doctor notes..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Camera / File Selection Buttons */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-[52px] bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-900 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4 text-teal-700" />
              <span>Take Photo</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[52px] bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-xs"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Browse Document</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* File Selected Preview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {selectedFile.previewUrl ? (
                  <img
                    src={selectedFile.previewUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 truncate">{selectedFile.fileName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {(selectedFile.sizeBytes / 1024).toFixed(1)} KB • {selectedDocType}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50"
              >
                Change
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={uploading}
              onClick={handleUploadDocument}
              className="w-full min-h-[48px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 text-xs"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading & Running OCR Digitization...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Submit & Digitize Document</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Latest Upload Outcome Card */}
      {latestUploadResult && (
        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 text-xs text-emerald-950 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Document Successfully Uploaded & Persisted</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            {latestUploadResult.ocrResult.success ? (
              <span>
                Digital text extraction processed <strong>{latestUploadResult.ocrResult.fieldsExtracted} clinical fields</strong> from your document.
              </span>
            ) : (
              <span>
                Document received securely. Your treating doctor will inspect the uploaded document directly during review.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Uploaded Documents Gallery */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Uploaded Documents ({documents.length})</span>
          </h3>
          <button
            type="button"
            onClick={loadDocuments}
            disabled={loadingDocs}
            className="text-[11px] text-teal-700 hover:underline font-semibold flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingDocs ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No documents uploaded yet for this visit. Take a photo or upload above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="overflow-hidden">
                  <div className="font-bold text-xs text-slate-800 truncate">{doc.fileName}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>{doc.documentType}</span>
                    <span>•</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        doc.ocrStatus === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.ocrStatus === 'FAILED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {doc.ocrStatus}
                    </span>
                  </div>
                </div>

                <a
                  href={`http://localhost:5001/api/v1/kiosk/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Scan</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guided Case Intake Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs tracking-wider uppercase">
            <HeartHandshake className="w-4 h-4 text-teal-200" />
            <span>Pre-Consultation Case Intake</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Recommended</span>
        </div>
        <p className="text-xs text-teal-100 leading-relaxed">
          Complete simple guided questions about your symptoms before meeting the physician.
        </p>
        <button
          type="button"
          onClick={() => navigate('/interview')}
          className="w-full min-h-[44px] bg-white hover:bg-teal-50 text-teal-900 font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 mt-2"
        >
          <span>Start Guided Intake on Phone</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
