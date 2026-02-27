<?php
/**
 * Updated Customer Class with Tenant Isolation
 * Example of how to use TenantMiddleware
 */

class Customer extends TenantMiddleware {
    
    /**
     * Create a new customer in the tenant
     * 
     * @param array $data
     * @return string Customer ID
     * @throws Exception
     */
    public function create($data) {
        // Ensure tenant is set
        if (!$this->tenantId) {
            throw new Exception("Organization context is required");
        }
        
        $requiredFields = ['name', 'phone'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new Exception("الحقل $field مطلوب");
            }
        }
        
        // Check for duplicate phone WITHIN THIS TENANT
        $existing = $this->selectOneWithTenant(
            "SELECT id FROM customers WHERE phone = :phone",
            ['phone' => $data['phone']]
        );
        
        if ($existing) {
            throw new Exception("رقم الهاتف مستخدم بالفعل في هذه المنظمة");
        }
        
        $customerData = [
            'id' => $this->db->generateUUID(),
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'nationality' => $data['nationality'] ?? null,
            'passport_number' => $data['passport_number'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'customer_segment' => $data['customer_segment'] ?? 'new',
            'notes' => $data['notes'] ?? null
        ];
        
        return $this->insertWithTenant('customers', $customerData);
    }
    
    /**
     * Update customer - must belong to same tenant
     * 
     * @param string $id
     * @param array $data
     * @return bool
     * @throws Exception
     */
    public function update($id, $data) {
        if (!$this->tenantId) {
            throw new Exception("Organization context is required");
        }
        
        // Validate we can access this customer
        if (!$this->validateRecordAccess($id, 'customers')) {
            throw new Exception("العميل غير موجود أو لا تملك صلاحية الوصول إليه");
        }
        
        // Check for duplicate phone (excluding current)
        if (!empty($data['phone'])) {
            $existing = $this->selectOneWithTenant(
                "SELECT id FROM customers WHERE phone = :phone AND id != :id",
                ['phone' => $data['phone'], 'id' => $id]
            );
            
            if ($existing) {
                throw new Exception("رقم الهاتف مستخدم بالفعل");
            }
        }
        
        $allowedFields = ['name', 'phone', 'email', 'address', 'nationality', 
                         'passport_number', 'date_of_birth', 'customer_segment', 'notes'];
        
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateData[$field] = $data[$field];
            }
        }
        
        if (empty($updateData)) {
            throw new Exception("لا توجد بيانات للتحديث");
        }
        
        return $this->updateWithTenant(
            'customers',
            $updateData,
            'id = :id',
            ['id' => $id]
        );
    }
    
    /**
     * Get customer by ID - with tenant filter
     * 
     * @param string $id
     * @return array|null
     */
    public function getById($id) {
        if (!$this->tenantId) {
            throw new Exception("Organization context is required");
        }
        
        return $this->selectOneWithTenant(
            "SELECT * FROM customers WHERE id = :id",
            ['id' => $id]
        );
    }
    
    /**
     * Get all customers in this tenant with pagination
     * 
     * @param int $page
     * @param int $perPage
     * @param string $search
     * @param string $segment
     * @return array
     */
    public function getAll($page = 1, $perPage = 20, $search = '', $segment = '') {
        if (!$this->tenantId) {
            throw new Exception("Organization context is required");
        }
        
        $conditions = ['1=1'];
        $params = [];
        
        if (!empty($search)) {
            $conditions[] = "(name LIKE :search OR phone LIKE :search OR email LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        if (!empty($segment)) {
            $conditions[] = "customer_segment = :segment";
            $params['segment'] = $segment;
        }
        
        $whereClause = implode(' AND ', $conditions);
        
        // Build SQL that will be filtered by tenant
        $sql = "SELECT * FROM customers 
                WHERE $whereClause
                ORDER BY created_at DESC 
                LIMIT :offset, :perPage";
        
        $params['offset'] = ($page - 1) * $perPage;
        $params['perPage'] = $perPage;
        
        return $this->selectWithTenant($sql, $params);
    }
    
    /**
     * Get total count of customers in tenant
     * 
     * @param string $search
     * @return int
     */
    public function getCount($search = '') {
        if (!$this->tenantId) {
            throw new Exception("Organization context is required");
        }
        
        $sql = "SELECT COUNT(*) as count FROM customers";
        
        if (!empty($search)) {
            $sql .= " WHERE (name LIKE :search OR phone LIKE :search OR email LIKE :search)";
            $result = $this->selectOneWithTenant(
                $sql,
                ['search' => "%$search%"]
            );
        } else {
            $result = $this->selectOneWithTenant($sql, []);
        }
        
        return $result ? intval($result['count']) : 0;
    }
    
    /**
     * Delete customer - with tenant filter
     * 
     * @param string $id
     * @return bool
     * @throws Exception
     */
    public function delete($id) {
        if (!$this->tenantId) {
            throw new Exception("Organization context is required");
        }
        
        // Check access first
        if (!$this->validateRecordAccess($id, 'customers')) {
            throw new Exception("العميل غير موجود أو لا تملك صلاحية الوصول إليه");
        }
        
        return $this->deleteWithTenant(
            'customers',
            'id = :id',
            ['id' => $id]
        );
    }
    
    /**
     * Get customers by segment (within tenant)
     * 
     * @param string $segmentId
     * @return array
     */
    public function getBySegment($segmentId) {
        if (!$this->tenantId) {
            throw new Exception("Organization context is required");
        }
        
        return $this->selectWithTenant(
            "SELECT * FROM customers WHERE segment_id = :segment_id ORDER BY name",
            ['segment_id' => $segmentId]
        );
    }
}
?>
