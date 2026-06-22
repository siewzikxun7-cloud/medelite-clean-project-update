import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import './style.css';

type FacilityData = {
  ccn: string;
  providerName: string;
  location: string;
  state: string;
  certifiedBeds: string;
  averageResidents: string;
  overallRating: string;
  healthInspectionRating: string;
  staffingRating: string;
  qmRating: string;
  warning?: string;
};

type ManualInputs = {
  facilityNameOverride: string;
  emr: string;
  currentCensus: string;
  typeOfPatient: string;
  previousCoverage: string;
  previousProviderPerformance: string;
  medicalCoverage: string;
  shortTermHospitalization: string;
  strNationalAvgHospitalization: string;
  strStateAvgHospitalization: string;
  strEdVisit: string;
  strEdVisitsNationalAvg: string;
  strEdVisitsStateAvg: string;
  ltHospitalization: string;
  ltNationalAvgHospitalization: string;
  ltStateAvgHospitalization: string;
  edVisit: string;
  ltEdVisitsNationalAvg: string;
  ltEdVisitsStateAvg: string;
};

const fallbackKendall: FacilityData = {
  ccn: '686123',
  providerName: 'Kendall Lakes Healthcare and Rehab Center',
  location: '5280 SW 157th Ave, Miami, FL',
  state: 'FL',
  certifiedBeds: '120',
  averageResidents: '112',
  overallRating: '1',
  healthInspectionRating: '1',
  staffingRating: '2',
  qmRating: '4',
};

const defaultManualInputs: ManualInputs = {
  facilityNameOverride: '',
  emr: 'PCC',
  currentCensus: '112',
  typeOfPatient: 'Long-term & Short-term',
  previousCoverage: 'Yes',
  previousProviderPerformance: 'About 30 patients/day',
  medicalCoverage: 'Optometry, PCP, Podiatry',
  shortTermHospitalization: '18.7%',
  strNationalAvgHospitalization: '21.5%',
  strStateAvgHospitalization: '23.8%',
  strEdVisit: '13.9%',
  strEdVisitsNationalAvg: '11.6%',
  strEdVisitsStateAvg: '9.3%',
  ltHospitalization: '1.86',
  ltNationalAvgHospitalization: '1.65',
  ltStateAvgHospitalization: '1.95',
  edVisit: '6.94',
  ltEdVisitsNationalAvg: '1.65',
  ltEdVisitsStateAvg: '1.21',
};

async function fetchFacilityByCcn(ccn: string): Promise<FacilityData> {
  const response = await fetch(`/api/facility?ccn=${encodeURIComponent(ccn)}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || `Lookup failed for CCN ${ccn}`);
  }

  return payload;
}

function createPdf(facility: FacilityData, manual: ManualInputs) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const finalFacilityName = manual.facilityNameOverride.trim() || facility.providerName;
  const medicareUrl = `https://www.medicare.gov/care-compare/details/nursing-home/${facility.ccn}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('INFINITE', pageWidth / 2 - 75, 62);
  doc.setFontSize(10);
  doc.text('Managed by MEDELITE', pageWidth / 2 + 40, 64);

  doc.setFontSize(12);
  doc.text('FACILITY ASSESSMENT SNAPSHOT', pageWidth / 2, 100, { align: 'center' });
  doc.text(facility.state || '{STATE}', pageWidth / 2, 118, { align: 'center' });

  const rows: Array<[string, string]> = [
    ['Name of Facility', finalFacilityName],
    ['Location', facility.location],
    ['EMR', manual.emr],
    ['Census Capacity', facility.certifiedBeds],
    ['Current Census', manual.currentCensus || facility.averageResidents],
    ['Type of Patient', manual.typeOfPatient],
    ['Previous Coverage from Medelite', manual.previousCoverage],
    ['Previous Provider Performance from Medelite', manual.previousProviderPerformance],
    ['Medical Coverage', manual.medicalCoverage],
    ['Overall Star Rating', facility.overallRating],
    ['Health Inspection', facility.healthInspectionRating],
    ['Staffing', facility.staffingRating],
    ['Quality of Resident Care', facility.qmRating],
    ['Short Term Hospitalization', manual.shortTermHospitalization],
    ['STR National Avg. for Hospitalization', manual.strNationalAvgHospitalization],
    ['STR State National Avg. for Hospitalization', manual.strStateAvgHospitalization],
    ['STR ED Visit', manual.strEdVisit],
    ['STR ED Visits National Avg.', manual.strEdVisitsNationalAvg],
    ['STR ED Visits State Avg.', manual.strEdVisitsStateAvg],
    ['LT Hospitalization', manual.ltHospitalization],
    ['LT National Avg. for Hospitalization', manual.ltNationalAvgHospitalization],
    ['LT State National Avg. for Hospitalization', manual.ltStateAvgHospitalization],
    ['ED Visit', manual.edVisit],
    ['LT ED Visits National Avg.', manual.ltEdVisitsNationalAvg],
    ['LT ED Visits State Avg.', manual.ltEdVisitsStateAvg],
  ];

  const startX = 70;
  let y = 140;
  const labelW = 250;
  const valueW = 292;
  const rowH = 24;

  doc.setFontSize(9);

  rows.forEach(([label, val]) => {
    doc.setDrawColor(0);
    doc.rect(startX, y, labelW, rowH);
    doc.rect(startX + labelW, y, valueW, rowH);

    doc.setFont('helvetica', 'bold');
    doc.text(label, startX + 8, y + 16);

    doc.setFont('helvetica', 'italic');
    const cleanVal = val || 'N/A';
    const splitValue = doc.splitTextToSize(cleanVal, valueW - 16);
    doc.text(splitValue.slice(0, 1), startX + labelW + 8, y + 16);

    y += rowH;
  });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 85, 180);
  doc.textWithLink('Medicare Care Compare Source', startX, y + 28, { url: medicareUrl });
  doc.setTextColor(0, 0, 0);

  doc.save(`${finalFacilityName.replace(/[^a-z0-9]/gi, '_')}_Facility_Assessment.pdf`);
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function App() {
  const [ccn, setCcn] = useState('686123');
  const [facility, setFacility] = useState<FacilityData | null>(fallbackKendall);
  const [manual, setManual] = useState<ManualInputs>(defaultManualInputs);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Sample data loaded. Click Lookup CMS Data to test live API lookup.');

  const updateManual = (key: keyof ManualInputs, nextValue: string) => {
    setManual((prev) => ({ ...prev, [key]: nextValue }));
  };

  const handleLookup = async () => {
    const trimmedCcn = ccn.trim();
    if (!trimmedCcn) {
      setMessage('Please enter a CCN.');
      return;
    }

    setLoading(true);
    setMessage('Looking up CMS Provider Information through API...');
    try {
      const result = await fetchFacilityByCcn(trimmedCcn);
      setFacility(result);
      setMessage(
        result.warning
          ? `Loaded validation data for ${result.providerName}. ${result.warning}`
          : `Loaded CMS data for ${result.providerName}.`
      );
    } catch (error) {
      setFacility(null);
      setMessage(error instanceof Error ? error.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const reportName = facility ? manual.facilityNameOverride || facility.providerName : '';

  return (
    <main className="page">
      <section className="hero">
        <div className="brand">INFINITE <span>Managed by MEDELITE</span></div>
        <h1>Facility Assessment Report Generator</h1>
        <p>Enter a nursing home CCN, pull CMS public data, add MedElite inputs, and download a polished snapshot PDF.</p>
      </section>

      <section className="card lookup-card">
        <div>
          <label className="field">
            <span>CMS Certification Number (CCN)</span>
            <input value={ccn} onChange={(e) => setCcn(e.target.value)} placeholder="686123" />
          </label>
          <p className="hint">Test case: 686123 — Kendall Lakes Healthcare and Rehab Center</p>
        </div>
        <button onClick={handleLookup} disabled={loading}>
          {loading ? 'Loading...' : 'Lookup CMS Data'}
        </button>
      </section>

      <p className="status">{message}</p>

      {facility && (
        <>
          <section className="grid">
            <div className="card">
              <h2>CMS Data</h2>
              <dl className="summary">
                <dt>Provider Name</dt><dd>{facility.providerName}</dd>
                <dt>Location</dt><dd>{facility.location}</dd>
                <dt>State</dt><dd>{facility.state}</dd>
                <dt>Certified Beds</dt><dd>{facility.certifiedBeds}</dd>
                <dt>Overall Rating</dt><dd>{facility.overallRating}</dd>
                <dt>Health Inspection</dt><dd>{facility.healthInspectionRating}</dd>
                <dt>Staffing</dt><dd>{facility.staffingRating}</dd>
                <dt>Quality of Resident Care</dt><dd>{facility.qmRating}</dd>
              </dl>
            </div>

            <div className="card">
              <h2>Manual MedElite Inputs</h2>
              <div className="form-grid">
                <InputField label="Facility Name Override" value={manual.facilityNameOverride} onChange={(v) => updateManual('facilityNameOverride', v)} />
                <InputField label="EMR" value={manual.emr} onChange={(v) => updateManual('emr', v)} />
                <InputField label="Current Census" value={manual.currentCensus} onChange={(v) => updateManual('currentCensus', v)} />
                <InputField label="Type of Patient" value={manual.typeOfPatient} onChange={(v) => updateManual('typeOfPatient', v)} />
                <InputField label="Previous Coverage from Medelite" value={manual.previousCoverage} onChange={(v) => updateManual('previousCoverage', v)} />
                <InputField label="Previous Provider Performance" value={manual.previousProviderPerformance} onChange={(v) => updateManual('previousProviderPerformance', v)} />
                <InputField label="Medical Coverage" value={manual.medicalCoverage} onChange={(v) => updateManual('medicalCoverage', v)} />
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Hospitalization / ED Metrics</h2>
            <p className="hint">Included for the sample report. These can be replaced with mapped claims-based CMS metrics later.</p>
            <div className="form-grid metric-grid">
              <InputField label="Short Term Hospitalization" value={manual.shortTermHospitalization} onChange={(v) => updateManual('shortTermHospitalization', v)} />
              <InputField label="STR National Avg. Hospitalization" value={manual.strNationalAvgHospitalization} onChange={(v) => updateManual('strNationalAvgHospitalization', v)} />
              <InputField label="STR State Avg. Hospitalization" value={manual.strStateAvgHospitalization} onChange={(v) => updateManual('strStateAvgHospitalization', v)} />
              <InputField label="STR ED Visit" value={manual.strEdVisit} onChange={(v) => updateManual('strEdVisit', v)} />
              <InputField label="STR ED Visits National Avg." value={manual.strEdVisitsNationalAvg} onChange={(v) => updateManual('strEdVisitsNationalAvg', v)} />
              <InputField label="STR ED Visits State Avg." value={manual.strEdVisitsStateAvg} onChange={(v) => updateManual('strEdVisitsStateAvg', v)} />
              <InputField label="LT Hospitalization" value={manual.ltHospitalization} onChange={(v) => updateManual('ltHospitalization', v)} />
              <InputField label="LT National Avg. Hospitalization" value={manual.ltNationalAvgHospitalization} onChange={(v) => updateManual('ltNationalAvgHospitalization', v)} />
              <InputField label="LT State Avg. Hospitalization" value={manual.ltStateAvgHospitalization} onChange={(v) => updateManual('ltStateAvgHospitalization', v)} />
              <InputField label="ED Visit" value={manual.edVisit} onChange={(v) => updateManual('edVisit', v)} />
              <InputField label="LT ED Visits National Avg." value={manual.ltEdVisitsNationalAvg} onChange={(v) => updateManual('ltEdVisitsNationalAvg', v)} />
              <InputField label="LT ED Visits State Avg." value={manual.ltEdVisitsStateAvg} onChange={(v) => updateManual('ltEdVisitsStateAvg', v)} />
            </div>
          </section>

          <section className="card preview">
            <h2>Report Preview</h2>
            <p><strong>{reportName}</strong></p>
            <p>{facility.location}</p>
            <p>Care Compare: https://www.medicare.gov/care-compare/details/nursing-home/{facility.ccn}</p>
            <button className="download" onClick={() => createPdf(facility, manual)}>Download PDF</button>
          </section>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
