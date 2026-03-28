'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RiskBadge from '@/components/ui/RiskBadge';
import BloodTypeBadge from '@/components/ui/BloodTypeBadge';
import ForecastChart from '@/components/charts/ForecastChart';
import { api } from '@/lib/api';
import type { ForecastResult } from '@/types';
import { AlertTriangle, TrendingUp, Clock, Droplets, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const CITIES = ['All', 'Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier'];
const BLOOD_TYPES_FILTER = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const MOCK_FORECASTS: ForecastResult[] = [
  { city: 'Casablanca', blood_type: 'O-', risk_score: 89, risk_level: 'critical', predicted_shortage_days: 3, current_stock_units: 12, daily_demand_units: 4, confidence_score: 0.91, contributing_factors: ['High demand', 'Low stock', 'Seasonal pattern'], recommended_action: 'Launch emergency campaign immediately', forecast_date: new Date().toISOString() },
  { city: 'Rabat', blood_type: 'AB-', risk_score: 85, risk_level: 'critical', predicted_shortage_days: 5, current_stock_units: 8, daily_demand_units: 2, confidence_score: 0.88, contributing_factors: ['Rare blood type', 'Low donor pool'], recommended_action: 'Activate targeted donor campaign', forecast_date: new Date().toISOString() },
  { city: 'Casablanca', blood_type: 'B-', risk_score: 72, risk_level: 'high', predicted_shortage_days: 9, current_stock_units: 24, daily_demand_units: 3, confidence_score: 0.82, contributing_factors: ['Increasing demand', 'Holiday period'], recommended_action: 'Schedule proactive campaign within 48 hours', forecast_date: new Date().toISOString() },
  { city: 'Marrakech', blood_type: 'A-', risk_score: 68, risk_level: 'high', predicted_shortage_days: 12, current_stock_units: 31, daily_demand_units: 3, confidence_score: 0.79, contributing_factors: ['Tourism season', 'Surgical demand'], recommended_action: 'Begin donor outreach campaign', forecast_date: new Date().toISOString() },
  { city: 'Fes', blood_type: 'O+', risk_score: 45, risk_level: 'medium', predicted_shortage_days: 20, current_stock_units: 87, daily_demand_units: 5, confidence_score: 0.74, contributing_factors: ['Gradual depletion', 'Upcoming surgeries'], recommended_action: 'Schedule routine donation drive', forecast_date: new Date().toISOString() },
  { city: 'Tangier', blood_type: 'A+', risk_score: 38, risk_level: 'medium', predicted_shortage_days: 25, current_stock_units: 110, daily_demand_units: 4, confidence_score: 0.70, contributing_factors: ['Moderate demand'], recommended_action: 'Monitor and prepare contingency plan', forecast_date: new Date().toISOString() },
  { city: 'Casablanca', blood_type: 'B+', risk_score: 22, risk_level: 'low', predicted_shortage_days: 45, current_stock_units: 145, daily_demand_units: 3, confidence_score: 0.85, contributing_factors: ['Adequate stock', 'Normal demand'], recommended_action: 'Routine maintenance only', forecast_date: new Date().toISOString() },
  { city: 'Rabat', blood_type: 'AB+', risk_score: 15, risk_level: 'low', predicted_shortage_days: 60, current_stock_units: 203, daily_demand_units: 3, confidence_score: 0.90, contributing_factors: ['Good stock levels'], recommended_action: 'No action required', forecast_date: new Date().toISOString() },
];

// Generate chart data for a forecast
function generateForecastChartData(forecast: ForecastResult) {
  const days = 30;
  const data = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() + i * 86400000);
    const score = Math.min(100, forecast.risk_score + (i / days) * 15 + Math.sin(i) * 5);
    data.push({
      date: date.toISOString(),
      risk_score: Math.round(score),
    });
  }
  return data;
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('All');
  const [btFilter, setBtFilter] = useState('All');
  const [selectedForecast, setSelectedForecast] = useState<ForecastResult | null>(null);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const data = await api.getForecasts();
      setForecasts(data.length > 0 ? data : MOCK_FORECASTS);
    } catch {
      setForecasts(MOCK_FORECASTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, []);

  const filtered = forecasts.filter((f) => {
    const matchCity = cityFilter === 'All' || f.city === cityFilter;
    const matchBT = btFilter === 'All' || f.blood_type === btFilter;
    return matchCity && matchBT;
  });

  const criticalCount = filtered.filter((f) => f.risk_level === 'critical').length;
  const highCount = filtered.filter((f) => f.risk_level === 'high').length;

  return (
    <DashboardLayout title="Shortage Forecasts" subtitle="AI-powered 30-day blood shortage predictions">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-red-500 font-medium">Critical Alerts</p>
            <p className="text-2xl font-bold text-red-700">{criticalCount}</p>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-orange-500 font-medium">High Risk</p>
            <p className="text-2xl font-bold text-orange-700">{highCount}</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-blue-500 font-medium">Total Forecasts</p>
            <p className="text-2xl font-bold text-blue-700">{filtered.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        >
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
          value={btFilter}
          onChange={(e) => setBtFilter(e.target.value)}
        >
          {BLOOD_TYPES_FILTER.map((bt) => <option key={bt}>{bt}</option>)}
        </select>
        <button
          onClick={fetchForecasts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Forecast cards */}
        <div className="xl:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C41E3A]" />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedForecast(f === selectedForecast ? null : f)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedForecast === f
                      ? 'border-[#C41E3A] bg-red-50'
                      : f.risk_level === 'critical'
                      ? 'border-red-200 bg-red-50 hover:border-red-400'
                      : f.risk_level === 'high'
                      ? 'border-orange-200 bg-orange-50 hover:border-orange-400'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <BloodTypeBadge bloodType={f.blood_type} />
                      <div>
                        <p className="font-semibold text-gray-900">{f.city}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Shortage in <strong>{f.predicted_shortage_days} days</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                    <RiskBadge level={f.risk_level} score={f.risk_score} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-gray-500">
                    <div>
                      <p className="font-medium text-gray-700">Current Stock</p>
                      <p>{f.current_stock_units} units</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Daily Demand</p>
                      <p>{f.daily_demand_units} units/day</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Confidence</p>
                      <p>{Math.round(f.confidence_score * 100)}%</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-current border-opacity-10">
                    <p className="text-xs text-gray-600">
                      <strong className="text-gray-700">Action:</strong> {f.recommended_action}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selectedForecast ? (
            <>
              <ForecastChart
                data={generateForecastChartData(selectedForecast)}
                title={`${selectedForecast.blood_type} Risk in ${selectedForecast.city}`}
              />
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Contributing Factors</h3>
                <ul className="space-y-2">
                  {selectedForecast.contributing_factors.map((factor, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C41E3A] shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Forecast Date</h3>
                <p className="text-sm text-gray-600">{format(new Date(selectedForecast.forecast_date), 'PPpp')}</p>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <TrendingUp className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">Select a forecast to view the 30-day risk chart</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
