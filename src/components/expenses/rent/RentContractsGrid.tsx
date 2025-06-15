
import RentContractCard from './RentContractCard';

interface RentContractsGridProps {
  contracts: any[];
}

const RentContractsGrid = ({ contracts }: RentContractsGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contracts?.map((contract) => (
        <RentContractCard key={contract.id} contract={contract} />
      ))}
    </div>
  );
};

export default RentContractsGrid;
