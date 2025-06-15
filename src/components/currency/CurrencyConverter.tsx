
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CURRENCY_SYMBOLS, CURRENCY_NAMES } from "@/types/currency";
import { Calculator } from "lucide-react";

const CurrencyConverter = () => {
  const [amount, setAmount] = useState<string>("1");

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Calculator className="h-5 w-5" />
          حاسبة المبالغ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">المبلغ</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="أدخل المبلغ"
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {formatAmount(Number(amount) || 0)} {CURRENCY_SYMBOLS.EGP}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {CURRENCY_NAMES.EGP}
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          النظام موحد بالجنيه المصري كعملة أساسية
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrencyConverter;
