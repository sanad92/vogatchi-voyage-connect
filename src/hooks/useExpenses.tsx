
import { useEmployees } from './useEmployees';
import { useRentContracts } from './useRentContracts';
import { useExpenseTransactions } from './useExpenseTransactions';
import { useSalaries } from './useSalaries';
import { useExpenseCategories } from './useExpenseCategories';

export const useExpenses = () => {
  const {
    employees,
    employeesLoading,
    addEmployee,
    isAddingEmployee,
  } = useEmployees();

  const {
    rentContracts,
    contractsLoading,
    addRentContract,
    isAddingContract,
  } = useRentContracts();

  const {
    expenseTransactions,
    transactionsLoading,
    addExpenseTransaction,
    isAddingTransaction,
  } = useExpenseTransactions();

  const {
    monthlySalaries,
    salariesLoading,
    calculateMonthlySalary,
    isCalculatingSalary,
  } = useSalaries();

  const {
    expenseCategories,
    categoriesLoading,
  } = useExpenseCategories();

  return {
    // Categories
    expenseCategories,
    categoriesLoading,
    
    // Employees
    employees,
    employeesLoading,
    addEmployee,
    isAddingEmployee,
    
    // Rent Contracts
    rentContracts,
    contractsLoading,
    addRentContract,
    isAddingContract,
    
    // Expense Transactions
    expenseTransactions,
    transactionsLoading,
    addExpenseTransaction,
    isAddingTransaction,
    
    // Salaries
    monthlySalaries,
    salariesLoading,
    calculateMonthlySalary,
    isCalculatingSalary,
  };
};
