
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import DailyOperations from "@/pages/DailyOperations";
import HotelBookings from "@/pages/HotelBookings";
import FlightBookings from "@/pages/FlightBookings";
import Customers from "@/pages/Customers";
import CustomerService from "@/pages/CustomerService";
import Suppliers from "@/pages/Suppliers";
import Invoices from "@/pages/Invoices";
import PaymentOrders from "@/pages/PaymentOrders";
import Reports from "@/pages/Reports";
import AdminSettings from "@/pages/AdminSettings";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import BankAccounts from "@/pages/BankAccounts";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <Index />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/daily-operations" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <DailyOperations />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/hotel-bookings" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <HotelBookings />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/flight-bookings" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <FlightBookings />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <Customers />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/customer-service" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <CustomerService />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/suppliers" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <Suppliers />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/invoices" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <Invoices />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/payment-orders" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <PaymentOrders />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/bank-accounts" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <BankAccounts />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <Reports />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin-settings" element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1">
                  <AdminSettings />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
