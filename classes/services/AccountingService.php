<?php

require_once __DIR__ . '/../repositories/ChartOfAccountsRepository.php';
require_once __DIR__ . '/../repositories/JournalEntryRepository.php';

class AccountingService {
    private $coaRepo;
    private $jeRepo;

    public function __construct() {
        $this->coaRepo = new ChartOfAccountsRepository();
        $this->jeRepo = new JournalEntryRepository();
    }

    /* Chart of accounts operations */
    public function addAccount(array $data) {
        // expected keys: name, code, type, parent_id?
        $data['organization_id'] = TenantMiddleware::getOrganizationId();
        return $this->coaRepo->create($data);
    }

    public function getAccountByCode($code) {
        return $this->coaRepo->getByCode($code);
    }

    /* Posting journal entries */
    public function postEntry(string $entryDate, string $description, array $lines, $reference = null, $createdBy = null) {
        // lines: array of ['account_id'|'account_code'=>..., 'debit'=>x, 'credit'=>y, 'description'=>...?]
        // convert code to id if necessary
        $validatedLines = [];
        $totalDebit = 0;
        $totalCredit = 0;
        foreach ($lines as $line) {
            if (isset($line['account_code'])) {
                $account = $this->coaRepo->getByCode($line['account_code']);
                if (!$account) {
                    throw new Exception("Account code {$line['account_code']} not found");
                }
                $line['account_id'] = $account['id'];
            }
            if (empty($line['account_id'])) {
                throw new Exception('Each journal line must refer to an account');
            }
            $debit = floatval($line['debit'] ?? 0);
            $credit = floatval($line['credit'] ?? 0);
            $totalDebit += $debit;
            $totalCredit += $credit;
            $validatedLines[] = [
                'account_id' => $line['account_id'],
                'debit' => $debit,
                'credit' => $credit,
                'description' => $line['description'] ?? null
            ];
        }
        if (abs($totalDebit - $totalCredit) > 0.001) {
            throw new Exception('Journal entry not balanced: debits must equal credits');
        }
        $header = [
            'entry_date' => $entryDate,
            'description' => $description,
            'reference' => $reference,
            'created_by' => $createdBy
        ];
        return $this->jeRepo->createEntry($header, $validatedLines);
    }

    /* Reports */
    public function trialBalance($date = null) {
        $org = TenantMiddleware::getOrganizationId();
        $sql = "SELECT coa.code, coa.name, coa.type,
                       SUM(jl.debit) as debit, SUM(jl.credit) as credit
                FROM journal_lines jl
                JOIN journal_entries je ON je.id = jl.journal_entry_id
                JOIN chart_of_accounts coa ON coa.id = jl.account_id
                WHERE je.organization_id = :org";
        $params = ['org' => $org];
        if ($date) {
            $sql .= " AND je.entry_date <= :date";
            $params['date'] = $date;
        }
        $sql .= " GROUP BY coa.id ORDER BY coa.code";
        return $this->coaRepo->db->selectAll($sql, $params);
    }

    public function profitAndLoss($startDate, $endDate) {
        $org = TenantMiddleware::getOrganizationId();
        $sql = "SELECT coa.type, coa.code, coa.name,
                       SUM(jl.debit) as debit, SUM(jl.credit) as credit
                FROM journal_lines jl
                JOIN journal_entries je ON je.id = jl.journal_entry_id
                JOIN chart_of_accounts coa ON coa.id = jl.account_id
                WHERE je.organization_id = :org
                  AND je.entry_date BETWEEN :start AND :end
                  AND coa.type IN ('revenue','expense')
                GROUP BY coa.id ORDER BY coa.code";
        return $this->coaRepo->db->selectAll($sql, [
            'org' => $org,
            'start' => $startDate,
            'end' => $endDate
        ]);
    }

    public function balanceSheet($asOfDate = null) {
        $org = TenantMiddleware::getOrganizationId();
        $sql = "SELECT coa.type, coa.code, coa.name,
                       SUM(jl.debit) as debit, SUM(jl.credit) as credit
                FROM journal_lines jl
                JOIN journal_entries je ON je.id = jl.journal_entry_id
                JOIN chart_of_accounts coa ON coa.id = jl.account_id
                WHERE je.organization_id = :org
                  AND coa.type IN ('asset','liability','equity')";
        $params = ['org' => $org];
        if ($asOfDate) {
            $sql .= " AND je.entry_date <= :date";
            $params['date'] = $asOfDate;
        }
        $sql .= " GROUP BY coa.id ORDER BY coa.code";
        return $this->coaRepo->db->selectAll($sql, $params);
    }

}
