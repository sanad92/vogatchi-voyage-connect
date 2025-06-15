
import ExchangeRateEditor from './ExchangeRateEditor';

interface ExchangeRateGridProps {
  latestRates: Array<{
    pair: string;
    latest: any;
    previous?: any;
    trend: 'up' | 'down' | 'neutral';
  }>;
  onUpdate: () => void;
}

const ExchangeRateGrid = ({ latestRates, onUpdate }: ExchangeRateGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {latestRates.map(({ pair, latest, trend }) => (
        <ExchangeRateEditor
          key={pair}
          pair={pair}
          latest={latest}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};

export default ExchangeRateGrid;
