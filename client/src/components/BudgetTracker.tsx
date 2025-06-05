import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, PiggyBank, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface VenuePricing {
  placeId: string;
  name: string;
  priceLevel?: number; // 0-4 scale from Google
  estimatedCost?: number;
  category: string;
}

interface BudgetTrackerProps {
  venues: VenuePricing[];
  onBudgetChange?: (budget: number) => void;
  currency?: string;
  citySlug?: string;
}

const getPriceLevelLabel = (level: number, currencySymbol: string): string => {
  if (level === 0) return 'Free';
  return currencySymbol.repeat(level);
};

const PRICE_ESTIMATES: Record<string, Record<number, number>> = {
  nyc: {
    0: 0,
    1: 15,
    2: 30,
    3: 60,
    4: 100
  },
  london: {
    0: 0,
    1: 10,
    2: 20,
    3: 40,
    4: 65
  },
  boston: {
    0: 0,
    1: 12,
    2: 25,
    3: 45,
    4: 75
  },
  austin: {
    0: 0,
    1: 10,
    2: 20,
    3: 40,
    4: 70
  }
};

// Helper function to get currency symbol based on city
const getCurrencySymbol = (citySlug: string): string => {
  switch (citySlug) {
    case 'london':
      return '£';
    case 'nyc':
    case 'boston':
    case 'austin':
    default:
      return '$';
  }
};

export function BudgetTracker({ 
  venues, 
  onBudgetChange, 
  currency,
  citySlug = 'nyc' 
}: BudgetTrackerProps) {
  const [budget, setBudget] = useState(100);
  const [budgetMode, setBudgetMode] = useState<'moderate' | 'budget' | 'premium'>('moderate');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Use the provided currency or determine from city
  const displayCurrency = currency || getCurrencySymbol(citySlug);
  const cityEstimates = PRICE_ESTIMATES[citySlug] || PRICE_ESTIMATES.nyc;

  // Calculate total estimated cost
  const totalCost = venues.reduce((sum, venue) => {
    const priceLevel = venue.priceLevel ?? 2; // Default to moderate if unknown
    const estimate = venue.estimatedCost || cityEstimates[priceLevel];
    return sum + estimate;
  }, 0);

  // Calculate budget percentage used
  const budgetPercentage = budget > 0 ? (totalCost / budget) * 100 : 0;
  const isOverBudget = budgetPercentage > 100;

  // Auto-adjust budget based on mode
  useEffect(() => {
    const modeBudgets = {
      budget: { nyc: 50, london: 35, boston: 45, austin: 40 },
      moderate: { nyc: 100, london: 70, boston: 90, austin: 80 },
      premium: { nyc: 200, london: 140, boston: 180, austin: 160 }
    };
    
    const cityBudgets = modeBudgets[budgetMode];
    const defaultBudget = cityBudgets[citySlug as keyof typeof cityBudgets] || cityBudgets.nyc;
    setBudget(defaultBudget);
    onBudgetChange?.(defaultBudget);
  }, [budgetMode, citySlug, onBudgetChange]);

  // Get budget status color
  const getStatusColor = () => {
    if (budgetPercentage <= 50) return 'text-green-600';
    if (budgetPercentage <= 80) return 'text-yellow-600';
    if (budgetPercentage <= 100) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get progress bar color
  const getProgressColor = () => {
    if (budgetPercentage <= 50) return 'bg-green-500';
    if (budgetPercentage <= 80) return 'bg-yellow-500';
    if (budgetPercentage <= 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Tracker
          </span>
          <Badge variant={isOverBudget ? 'destructive' : 'secondary'}>
            {displayCurrency}{totalCost.toFixed(0)} / {displayCurrency}{budget}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Mode Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Budget Mode</label>
          <Select value={budgetMode} onValueChange={(value: any) => setBudgetMode(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budget">
                <span className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Budget Friendly
                </span>
              </SelectItem>
              <SelectItem value="moderate">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Moderate
                </span>
              </SelectItem>
              <SelectItem value="premium">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Premium Experience
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Budget Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Custom Budget</label>
            <span className={`text-sm font-bold ${getStatusColor()}`}>
              {displayCurrency}{budget}
            </span>
          </div>
          <Slider
            value={[budget]}
            onValueChange={([value]) => {
              setBudget(value);
              onBudgetChange?.(value);
            }}
            min={20}
            max={300}
            step={10}
            className="w-full"
          />
        </div>

        {/* Budget Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Budget Usage</span>
            <span className={`font-medium ${getStatusColor()}`}>
              {budgetPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={Math.min(budgetPercentage, 100)} 
            className={`h-2 ${getProgressColor()}`}
          />
        </div>

        {/* Over Budget Alert */}
        {isOverBudget && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your itinerary exceeds your budget by {displayCurrency}
              {(totalCost - budget).toFixed(0)}. Consider choosing more 
              budget-friendly options.
            </AlertDescription>
          </Alert>
        )}

        {/* Breakdown Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full"
        >
          {showBreakdown ? 'Hide' : 'Show'} Cost Breakdown
        </Button>

        {/* Cost Breakdown */}
        {showBreakdown && (
          <div className="space-y-2 pt-2 border-t">
            {venues.map((venue, index) => {
              const priceLevel = venue.priceLevel ?? 2;
              const estimate = venue.estimatedCost || cityEstimates[priceLevel];
              
              return (
                <div key={venue.placeId || index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{venue.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {getPriceLevelLabel(priceLevel, displayCurrency)}
                    </Badge>
                  </div>
                  <span className="font-medium">
                    {displayCurrency}{estimate}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 border-t font-medium">
              <span>Total Estimated Cost</span>
              <span className={getStatusColor()}>
                {displayCurrency}{totalCost.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* Budget Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 Tips to save money:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Look for happy hour deals at restaurants</li>
            <li>Consider free attractions like parks and markets</li>
            <li>Use public transportation when available</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}