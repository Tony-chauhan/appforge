// JSON Schema definitions for all pipeline stages
// Used by AJV for strict validation at each stage

export const intentSchema = {
  $id: 'intent',
  type: 'object',
  required: ['appName', 'appDescription', 'appType', 'features', 'entities', 'roles'],
  properties: {
    appName: { type: 'string', minLength: 1 },
    appDescription: { type: 'string', minLength: 10 },
    appType: { type: 'string', enum: ['crm', 'ecommerce', 'saas', 'social', 'marketplace', 'productivity', 'analytics', 'cms', 'erp', 'custom'] },
    features: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'description', 'priority', 'category'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['core', 'secondary', 'nice-to-have'] },
          category: { type: 'string', enum: ['auth', 'data', 'ui', 'business-logic', 'integration', 'analytics'] }
        }
      }
    },
    entities: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'description', 'attributes'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          attributes: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    roles: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'capabilities'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          capabilities: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    businessRules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description', 'type'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['access-control', 'data-validation', 'workflow', 'pricing', 'notification'] }
        }
      }
    },
    assumptions: { type: 'array', items: { type: 'string' } },
    ambiguities: { type: 'array', items: { type: 'string' } }
  },
  additionalProperties: false
};

export const designSchema = {
  $id: 'design',
  type: 'object',
  required: ['architecture', 'entities', 'pages', 'authFlows'],
  properties: {
    architecture: {
      type: 'object',
      required: ['type', 'frontend', 'backend', 'database'],
      properties: {
        type: { type: 'string', enum: ['monolithic', 'microservice', 'serverless'] },
        frontend: { type: 'string', enum: ['spa', 'ssr', 'static'] },
        backend: { type: 'string', enum: ['rest', 'graphql'] },
        database: { type: 'string', enum: ['postgresql', 'mysql', 'mongodb', 'sqlite'] }
      }
    },
    entities: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'attributes'],
        properties: {
          name: { type: 'string' },
          attributes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'type', 'required'],
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'email', 'url', 'enum', 'reference', 'text', 'decimal', 'json'] },
                required: { type: 'boolean' },
                unique: { type: 'boolean' },
                enumValues: { type: 'array', items: { type: 'string' } },
                referenceTo: { type: 'string' }
              }
            }
          },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'target'],
              properties: {
                type: { type: 'string', enum: ['hasMany', 'hasOne', 'belongsTo', 'manyToMany'] },
                target: { type: 'string' },
                through: { type: 'string' }
              }
            }
          }
        }
      }
    },
    pages: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'purpose', 'accessRoles'],
        properties: {
          name: { type: 'string' },
          purpose: { type: 'string' },
          accessRoles: { type: 'array', items: { type: 'string' } },
          components: { type: 'array', items: { type: 'string' } },
          dataEntities: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    authFlows: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'fields'],
        properties: {
          type: { type: 'string', enum: ['login', 'register', 'forgot-password', 'oauth', 'mfa'] },
          fields: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    businessFlows: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'steps'],
        properties: {
          name: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          triggerConditions: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  additionalProperties: false
};

export const uiSchema = {
  $id: 'ui-config',
  type: 'object',
  required: ['pages', 'navigation', 'theme'],
  properties: {
    pages: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'name', 'route', 'layout', 'components'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          route: { type: 'string', pattern: '^/' },
          layout: { type: 'string', enum: ['dashboard', 'form', 'list', 'detail', 'auth', 'landing', 'settings', 'analytics'] },
          requiredRoles: { type: 'array', items: { type: 'string' } },
          components: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'type'],
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                props: { type: 'object' },
                dataSource: {
                  type: 'object',
                  properties: {
                    endpoint: { type: 'string' },
                    method: { type: 'string' }
                  }
                },
                children: { type: 'array' }
              }
            }
          }
        }
      }
    },
    navigation: {
      type: 'object',
      required: ['type', 'items'],
      properties: {
        type: { type: 'string', enum: ['sidebar', 'topbar', 'both'] },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['label', 'route'],
            properties: {
              label: { type: 'string' },
              route: { type: 'string' },
              icon: { type: 'string' },
              roles: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    },
    theme: {
      type: 'object',
      required: ['primaryColor', 'mode'],
      properties: {
        primaryColor: { type: 'string' },
        secondaryColor: { type: 'string' },
        mode: { type: 'string', enum: ['light', 'dark', 'auto'] }
      }
    }
  },
  additionalProperties: false
};

export const apiSchema = {
  $id: 'api-config',
  type: 'object',
  required: ['baseUrl', 'endpoints'],
  properties: {
    baseUrl: { type: 'string' },
    endpoints: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'path', 'method', 'auth', 'relatedEntity', 'operation'],
        properties: {
          id: { type: 'string' },
          path: { type: 'string', pattern: '^/' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          description: { type: 'string' },
          auth: {
            type: 'object',
            required: ['required'],
            properties: {
              required: { type: 'boolean' },
              roles: { type: 'array', items: { type: 'string' } }
            }
          },
          request: {
            type: 'object',
            properties: {
              params: { type: 'array' },
              query: { type: 'array' },
              body: { type: 'object' }
            }
          },
          response: { type: 'object' },
          relatedEntity: { type: 'string' },
          operation: { type: 'string', enum: ['create', 'read', 'readAll', 'update', 'delete', 'custom', 'login', 'register', 'search'] }
        }
      }
    }
  },
  additionalProperties: false
};

export const dbSchema = {
  $id: 'db-config',
  type: 'object',
  required: ['dialect', 'tables'],
  properties: {
    dialect: { type: 'string', enum: ['postgresql', 'mysql', 'sqlite'] },
    tables: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'columns'],
        properties: {
          name: { type: 'string' },
          columns: {
            type: 'array', minItems: 1,
            items: {
              type: 'object',
              required: ['name', 'type'],
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['uuid', 'varchar', 'text', 'integer', 'bigint', 'boolean', 'timestamp', 'jsonb', 'decimal', 'date', 'enum', 'serial'] },
                primaryKey: { type: 'boolean' },
                nullable: { type: 'boolean' },
                unique: { type: 'boolean' },
                default: {},
                references: {
                  type: 'object',
                  properties: {
                    table: { type: 'string' },
                    column: { type: 'string' },
                    onDelete: { type: 'string', enum: ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'] }
                  }
                },
                enumValues: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          indexes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                columns: { type: 'array', items: { type: 'string' } },
                unique: { type: 'boolean' }
              }
            }
          },
          timestamps: { type: 'boolean' }
        }
      }
    }
  },
  additionalProperties: false
};

export const authSchema = {
  $id: 'auth-config',
  type: 'object',
  required: ['strategy', 'roles', 'permissions'],
  properties: {
    strategy: { type: 'string', enum: ['jwt', 'session'] },
    roles: {
      type: 'array', minItems: 1,
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          isDefault: { type: 'boolean' },
          inherits: { type: ['string', 'null'] }
        }
      }
    },
    permissions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['resource', 'actions'],
        properties: {
          resource: { type: 'string' },
          actions: {
            type: 'object',
            properties: {
              create: { type: 'array', items: { type: 'string' } },
              read: { type: 'array', items: { type: 'string' } },
              update: { type: 'array', items: { type: 'string' } },
              delete: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    },
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'type', 'effect'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['role-based', 'attribute-based', 'feature-gate'] },
          condition: { type: 'string' },
          effect: { type: 'string', enum: ['allow', 'deny'] }
        }
      }
    }
  },
  additionalProperties: false
};

export const businessLogicSchema = {
  $id: 'business-logic',
  type: 'object',
  required: ['rules'],
  properties: {
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'trigger', 'actions'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          trigger: {
            type: 'object',
            required: ['type', 'source'],
            properties: {
              type: { type: 'string', enum: ['api-call', 'schedule', 'event', 'condition'] },
              source: { type: 'string' }
            }
          },
          conditions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'operator', 'value'],
              properties: {
                field: { type: 'string' },
                operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'notIn', 'contains', 'exists'] },
                value: {}
              }
            }
          },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'target'],
              properties: {
                type: { type: 'string', enum: ['create', 'update', 'delete', 'notify', 'restrict', 'compute', 'redirect', 'email'] },
                target: { type: 'string' },
                params: { type: 'object' }
              }
            }
          }
        }
      }
    },
    computedFields: {
      type: 'array',
      items: {
        type: 'object',
        required: ['entity', 'field', 'formula'],
        properties: {
          entity: { type: 'string' },
          field: { type: 'string' },
          formula: { type: 'string' },
          dependencies: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  additionalProperties: false
};
