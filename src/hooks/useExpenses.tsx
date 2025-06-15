
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
    paymentsLoading: rentPaymentsLoading,
    addRentPayment,
    isAddingPayment,
    updatePaymentStatus,
    isUpdatingPayment,
    calculateTotalPaymentsInEGP,
  } = useRentPayments();

  const {
    commissions,
    commissionsLoading,
    commissionsError,
    commissionPayments,
    paymentsLoading: commissionPaymentsLoading,
    paymentsError,
    addCommissionPayment,
    markCommissionsAsPaid,
    updateEmployeeCommissionSettings,
    isAddingPayment: isAddingCommissionPayment,
    isUpdatingStatus: isUpdatingCommissionStatus,
    isUpdatingSettings: isUpdatingCommissionSettings,
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
    rentPaymentsLoading,
    addRentPayment,
    isAddingPayment,
    updatePaymentStatus,
    isUpdatingPayment,
    calculateTotalPaymentsInEGP,

    // Employee Commissions
    commissions,
    commissionsLoading,
    commissionsError,
    commissionPayments,
    commissionPaymentsLoading,
    paymentsError,
    addCommissionPayment,
    markCommissionsAsPaid,
    updateEmployeeCommissionSettings,
    isAddingCommissionPayment,
    isUpdatingCommissionStatus,
    isUpdatingCommissionSettings,
  };
};
