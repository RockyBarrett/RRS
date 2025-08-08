"use client";

import React, { useState } from 'react';
import { Calculator, DollarSign, TrendingUp, Users } from 'lucide-react';

export default function ROICalculatorStatic() {
  const [employees, setEmployees] = useState(100);

  // Simple calculation based on employees
  const monthlyEmployeeSavings = employees * 175;
  const annualEmployeeSavings = monthlyEmployeeSavings * 12;
  const annualEmployerSavings = employees * 600;
  const totalAnnualSavings = annualEmployeeSavings + annualEmployerSavings;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900">ROI Calculator</h1>
        <p className="mt-2 text-lg text-gray-600 max-w-xl mx-auto">
          Estimate your potential savings
        </p>
        <div className="mt-6">
          <input
            type="number"
            min={1}
            value={employees}
            onChange={(e) => setEmployees(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-40 p-3 border border-gray-300 rounded-md text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Number of Employees"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Employee Benefits */}
        <div className="bg-emerald-50 rounded-lg shadow-lg p-8 flex flex-col items-center text-center hover:scale-[1.03] transition-transform duration-300">
          <div className="flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-full mb-4">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-emerald-900 mb-1">Employee Benefits</h2>
          <p className="text-emerald-700 mb-4">Monthly take-home increase</p>
          <p className="text-3xl font-bold text-emerald-900">${monthlyEmployeeSavings.toLocaleString()}</p>
        </div>

        {/* Employer Savings */}
        <div className="bg-blue-50 rounded-lg shadow-lg p-8 flex flex-col items-center text-center hover:scale-[1.03] transition-transform duration-300">
          <div className="flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full mb-4">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-blue-900 mb-1">Employer Savings</h2>
          <p className="text-blue-700 mb-4">Annual FICA tax reduction</p>
          <p className="text-3xl font-bold text-blue-900">${annualEmployerSavings.toLocaleString()}</p>
        </div>

        {/* Total Impact */}
        <div className="bg-purple-50 rounded-lg shadow-lg p-8 flex flex-col items-center text-center hover:scale-[1.03] transition-transform duration-300">
          <div className="flex items-center justify-center w-14 h-14 bg-purple-600 rounded-full mb-4">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-purple-900 mb-1">Total Impact</h2>
          <p className="text-purple-700 mb-4">Combined annual savings</p>
          <p className="text-3xl font-bold text-purple-900">${totalAnnualSavings.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}