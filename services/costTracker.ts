export interface CostRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
}

class CostTracker {
  private records: CostRecord[] = [];
  private listeners: ((totalCost: number) => void)[] = [];

  // Pricing per 1M tokens (USD)
  private pricing: Record<string, { input: number, output: number }> = {
    'gemini-3.1-pro-preview': { input: 1.25, output: 5.00 },
    'gemini-3.1-pro': { input: 1.25, output: 5.00 },
    'gemini-3-flash-preview': { input: 0.075, output: 0.30 },
    'gemini-3.1-flash-lite-preview': { input: 0.0375, output: 0.15 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  };

  public addUsage(model: string, inputTokens: number, outputTokens: number) {
    // Default to flash pricing if model not found
    const rates = this.pricing[model] || { input: 0.075, output: 0.30 }; 
    const cost = (inputTokens / 1000000) * rates.input + (outputTokens / 1000000) * rates.output;
    
    this.records.push({
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now()
    });

    this.notifyListeners();
  }

  public getTotalCost(): number {
    return this.records.reduce((sum, record) => sum + record.cost, 0);
  }

  private notifyListeners() {
    const total = this.getTotalCost();
    this.listeners.forEach(listener => listener(total));
  }

  public subscribe(listener: (totalCost: number) => void) {
    this.listeners.push(listener);
    listener(this.getTotalCost());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const costTracker = new CostTracker();
