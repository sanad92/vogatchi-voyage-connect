
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from "@/types/currency";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CurrencyConverter = () => {
  const [amount, setAmount] = useState<string>("1");
  const [fromCurrency, setFromCurrency] = useState<string>("EGP");
  const [toCurrency, setToCurrency] = useState<string>("USD");
  const [convertedAmount, setConvertedAmount] = useState<number>(0);
  const { getCurrentRate } = useExchangeRates();

  useEffect(() => {
    const convertAmount = async () => {
      if (amount && !isNaN(Number(amount))) {
        const rate = await getCurrentRate(fromCurrency, toCurrency);
        setConvertedAmount(Number(amount) * rate);
      }
    };

    convertAmount();
  }, [amount, fromCurrency, toCurrency, getCurrentRate]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">محول العملات</CardTitle>
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

        <div className="space-y-2">
          <label className="text-sm font-medium">من</label>
          <Select value={fromCurrency} onValueChange={setFromCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map(currency => (
                <SelectItem key={currency} value={currency}>
                  {CURRENCY_NAMES[currency]} ({CURRENCY_SYMBOLS[currency]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={swapCurrencies}
            className="rounded-full p-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">إلى</label>
          <Select value={toCurrency} onValueChange={setToCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map(currency => (
                <SelectItem key={currency} value={currency}>
                  {CURRENCY_NAMES[currency]} ({CURRENCY_SYMBOLS[currency]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">
            {convertedAmount.toFixed(2)} {CURRENCY_SYMBOLS[toCurrency as keyof typeof CURRENCY_SYMBOLS]}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {amount} {CURRENCY_SYMBOLS[fromCurrency as keyof typeof CURRENCY_SYMBOLS]} = {convertedAmount.toFixed(2)} {CURRENCY_SYMBOLS[toCurrency as keyof typeof CURRENCY_SYMBOLS]}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrencyConverter;
