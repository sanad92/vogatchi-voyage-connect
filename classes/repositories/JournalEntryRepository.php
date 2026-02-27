<?php

require_once __DIR__ . '/BaseRepository.php';

class JournalEntryRepository extends BaseRepository {
    protected $table = 'journal_entries';

    public function __construct() {
        parent::__construct();
    }

    public function createEntry(array $header, array $lines) {
        // begin transaction
        $this->db->beginTransaction();
        try {
            $header['id'] = $this->db->generateUUID();
            $header['organization_id'] = TenantMiddleware::getOrganizationId();
            $this->db->insert($this->table, $header);

            foreach ($lines as $line) {
                $line['id'] = $this->db->generateUUID();
                $line['journal_entry_id'] = $header['id'];
                $this->db->insert('journal_lines', $line);
            }

            $this->db->commit();
            return $header['id'];
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getLines($entryId) {
        return $this->db->selectAll("SELECT jl.*, coa.code, coa.name, coa.type
            FROM journal_lines jl
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE jl.journal_entry_id = :id", ['id' => $entryId]);
    }

    public function getEntries($filters = []) {
        $sql = "SELECT * FROM journal_entries WHERE organization_id = :org";
        $params = ['org' => TenantMiddleware::getOrganizationId()];
        if (!empty($filters['date_from'])) {
            $sql .= " AND entry_date >= :from";
            $params['from'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $sql .= " AND entry_date <= :to";
            $params['to'] = $filters['date_to'];
        }
        $sql .= " ORDER BY entry_date DESC";
        return $this->db->selectAll($sql, $params);
    }
}
