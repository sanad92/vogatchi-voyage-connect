
import { useEmployees } from './useEmployees';
import { useRentContracts } from './useRentContracts';
import { useExpenseTransactions } from './useExpenseTransactions';
import { useSalaries } from './useSalaries';
import { useExpenseCategories } from './useExpenseCategories';
import { useRentPayments } from './useRentPayments';
import { useEmployeeCommissions } from './useEmployeeCommissions';

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

  const {
    rentPayments,
    paymentsLoading,
    addRentPayment,
    isAddingPayment,
    updatePaymentStatus,
    isUpdatingPayment,
    calculateTotalPaymentsInEGP,
  } = useRentPayments();

  const {
    commissions,
    commissionsLoading,
    commissionPayments,
    addCommissionPayment,
    markCommissionsAsPaid,
    isAddingPayment: isAddingCommissionPayment,
    isUpdatingStatus: isUpdatingCommissionStatus,
  } = useEmployeeCommissions();

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

    // Rent Payments
    rentPayments,
    paymentsLoading,
    addRentPayment,
    isAddingPayment,
    updatePaymentStatus,
    isUpdatingPayment,
    calculateTotalPaymentsInEGP,

    // Employee Commissions
    commissions,
    commissionsLoading,
    commissionPayments,
    addCommissionPayment,
    markCommissionsAsPaid,
    isAddingCommissionPayment,
    isUpdatingCommissionStatus,
  };
};
