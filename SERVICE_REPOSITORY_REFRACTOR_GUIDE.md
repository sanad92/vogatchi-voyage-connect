# Service / Repository Refactor Guide

This document outlines the pattern and the steps to migrate existing business
logic from "fat" model/controller classes into a clean **service → repository
design**.  The goal is maintainable, testable, tenant-aware, and permission-
friendly code.

---

## 🧱 Architectural Overview

1. **BaseRepository** (see `classes/repositories/BaseRepository.php`)
   - Extends `TenantMiddleware` to automatically scope queries.
   - Provides common database helpers (`select`, `update`, `paginate`, etc.).
2. **Specific repository** under `classes/repositories/` for each domain entity
   (e.g. `CustomerRepository`, `InvoiceRepository`, etc.).  Responsible only for
   raw data access.
3. **Service class** under `classes/services/` that depends on a repository.
   Contains validations, business rules, orchestration between repos, and
   throws exceptions on domain errors.
4. **Controllers** (web or API) instantiate a service, set tenant/user context,
   run RBAC/validation, and call high‑level methods on the service.  Controllers
   should not contain SQL or business logic beyond constructing response shells.

Existing slim model classes (e.g. `classes/Customer.php`) now extend the
corresponding repository to provide a drop‑in replacement; they will eventually
be removed after all call sites migrate.

---

## ✅ Migration Steps

1. **Create repository** for the entity
   - Move all SQL queries and CRUD operations into this class.
   - Use helper methods from `BaseRepository` to become tenant-aware.
   - Keep method names descriptive (`getById`, `getAll`, `countBookings`, etc.).
2. **Create service** for the entity
   - Implement validations and defaults as seen in the old class.
   - Throw `Exception` when business rules are violated.  Controllers will catch
     and return appropriate HTTP responses.
   - Add `setTenant()` and `setCurrentUser()` helper methods that delegate to
     the repository (for convenience).
   - Use repository methods; avoid direct DB calls here.
3. **Update controllers**
   - Require service & repository files at top.
   - Instantiate service with a new repository instance.
   - Propagate tenant/user context once in the constructor.
   - Replace direct model calls with service calls.
   - Keep RBAC, input validation and response formatting logic unchanged.
4. **Replace old class** with compatibility wrapper
   ```php
   require_once __DIR__.'/repositories/EntityRepository.php';
   class Entity extends EntityRepository {}
   ```
   This ensures existing pages/APIs continue working while migration happens.
5. **Refactor tests** (if present) to target service methods instead of models.
6. **Update documentation** (API docs, architecture guides) with the new
   pattern and add example code.

---

## 📌 Tips & Considerations

- **Tenant filtering** is automatic when the repository's `setTenantId()` is
  called.  Ensure controllers always set it (usually from current user).
- Use services for any logic that touches more than one repository (e.g.
  creating a booking and updating customer loyalty points simultaneously).
- Keep repository methods small and focused; they should not perform
  calculations or enforce business rules beyond simple existence checks.
- Naming: services usually mirror repository method names but may have more
  expressive verbs (`approveInvoice`, `calculateCustomerLifetimeValue`).
- For backward compatibility, gradually update UI pages and non-API code by
  swapping out direct model invocations with service calls.

---

## 📂 Example Files

* `classes/repositories/CustomerRepository.php`
* `classes/services/CustomerService.php`
* `admin/examples/CustomersController_Example.php`

These serve as concrete templates for other modules.

---

## 🎯 Goal

By steadily migrating components using this guide, the codebase will gain a
clear separation of concerns that simplifies maintenance, testing, and future
features (such as asynchronous jobs or GraphQL endpoints).  The pattern also
makes it easier to enforce multi‑tenant isolation and RBAC consistently across
all business operations.
