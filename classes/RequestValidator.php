<?php
/**
 * RequestValidator
 *
 * Lightweight validation layer inspired by Laravel's validator.  
 * Defines rules, runs them against input data and returns errors.
 */
class RequestValidator {
    private $data;
    private $rules;
    private $errors = [];

    public function __construct(array $data, array $rules) {
        $this->data  = $data;
        $this->rules = $rules;
    }

    /**
     * Perform validation and return boolean.
     */
    public function passes(): bool {
        $this->errors = [];

        foreach ($this->rules as $field => $rules) {
            $value = $this->data[$field] ?? null;
            $rules = is_array($rules) ? $rules : explode('|', $rules);

            foreach ($rules as $rule) {
                $this->applyRule($field, $value, $rule);
            }
        }

        return empty($this->errors);
    }

    public function fails(): bool {
        return !$this->passes();
    }

    public function errors(): array {
        return $this->errors;
    }

    private function applyRule($field, $value, $rule) {
        if (!$rule) {
            return;
        }

        if (strpos($rule, ':') !== false) {
            list($ruleName, $param) = explode(':', $rule, 2);
        } else {
            $ruleName = $rule;
            $param    = null;
        }

        switch ($ruleName) {
            case 'required':
                if ($value === null || $value === '') {
                    $this->addError($field, "The {$field} field is required.");
                }
                break;
            case 'email':
                if ($value !== null && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $this->addError($field, "The {$field} must be a valid email address.");
                }
                break;
            case 'string':
                if ($value !== null && !is_string($value)) {
                    $this->addError($field, "The {$field} must be a string.");
                }
                break;
            case 'integer':
                if ($value !== null && !filter_var($value, FILTER_VALIDATE_INT)) {
                    $this->addError($field, "The {$field} must be an integer.");
                }
                break;
            case 'numeric':
                if ($value !== null && !is_numeric($value)) {
                    $this->addError($field, "The {$field} must be a number.");
                }
                break;
            case 'min':
                if ($value !== null && strlen($value) < intval($param)) {
                    $this->addError($field, "The {$field} must be at least {$param} characters.");
                }
                break;
            case 'max':
                if ($value !== null && strlen($value) > intval($param)) {
                    $this->addError($field, "The {$field} must not exceed {$param} characters.");
                }
                break;
            case 'in':
                $options = explode(',', $param);
                if ($value !== null && !in_array($value, $options)) {
                    $this->addError($field, "The {$field} must be one of: {$param}.");
                }
                break;
            case 'regex':
                if ($value !== null && !preg_match($param, $value)) {
                    $this->addError($field, "The {$field} format is invalid.");
                }
                break;
            case 'url':
                if ($value !== null && !filter_var($value, FILTER_VALIDATE_URL)) {
                    $this->addError($field, "The {$field} must be a valid URL.");
                }
                break;
            case 'boolean':
                if ($value !== null && !is_bool($value) && !in_array($value, [0,1,'0','1'], true)) {
                    $this->addError($field, "The {$field} must be a boolean.");
                }
                break;
            case 'array':
                if ($value !== null && !is_array($value)) {
                    $this->addError($field, "The {$field} must be an array.");
                }
                break;
            default:
                // custom or unknown rule - ignore or extend
                break;
        }
    }

    private function addError($field, $message) {
        $this->errors[$field][] = $message;
    }
}
