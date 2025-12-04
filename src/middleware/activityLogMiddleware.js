import express from 'express';
import { createActivityLog, getUserInfoFromRequest, getIpAddress, matchRoute } from '../utils/activityLogger.js';

// Activity logging middleware
export const activityLogMiddleware = (io) => {
  return async (req, res, next) => {
    // Skip logging for certain routes
    const skipRoutes = [
      '/api/activity-logs', // Don't log the logs page itself (prevents infinite loop)
      '/health',
      '/ping'
    ];

    const shouldSkip = skipRoutes.some(route => req.path.includes(route));
    if (shouldSkip && req.method === 'GET') {
      return next();
    }

    // Skip routine GET requests (page loads, data fetching)
    // Only log important actions: POST, PUT, PATCH, DELETE
    // Also skip GET requests that are just loading data
    if (req.method === 'GET') {
      // Skip GET requests for listing/fetching data
      const skipGetPatterns = [
        /^\/api\/products$/,
        /^\/api\/products\?/,
        /^\/api\/materials$/,
        /^\/api\/materials\?/,
        /^\/api\/orders$/,
        /^\/api\/orders\?/,
        /^\/api\/customers$/,
        /^\/api\/customers\?/,
        /^\/api\/suppliers$/,
        /^\/api\/suppliers\?/,
        /^\/api\/raw-materials$/,
        /^\/api\/raw-materials\?/,
        /^\/api\/individual-products$/,
        /^\/api\/individual-products\?/,
        /^\/api\/production$/,
        /^\/api\/production\?/,
        /^\/api\/production-batches$/,
        /^\/api\/production-batches\?/,
        /^\/api\/dropdowns$/,
        /^\/api\/dropdowns\?/,
        /^\/api\/analytics/,
        /^\/api\/dashboard/,
        /^\/api\/auth\/me$/,
        /^\/api\/notifications$/,
        /^\/$/,
        /^\/waste$/,
        /^\/waste\?/
      ];

      const shouldSkipGet = skipGetPatterns.some(pattern => pattern.test(req.path));
      if (shouldSkipGet) {
        return next();
      }
    }

    // Capture start time
    const startTime = Date.now();

    // Store original response for later inspection
    const originalJson = res.json;
    let responseData = null;
    let statusCode = null;

    // Override res.json to capture response
    res.json = function (data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    // Wait for response to complete
    res.on('finish', async () => {
      try {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Get user info
        const userInfo = getUserInfoFromRequest(req);

        // Match route to action
        const routeConfig = matchRoute(req.method, req.path.replace('/api', ''));

        // Skip logging generic API_CALL actions - they're not meaningful
        if (routeConfig.action === 'API_CALL') {
          return; // Don't log generic API calls at all
        }

        // Skip login/logout - we don't need to log these
        if (routeConfig.action === 'LOGIN' || routeConfig.action === 'LOGOUT') {
          return;
        }

        // Skip VIEW actions - we don't need to log page views
        if (routeConfig.action.includes('VIEW')) {
          return;
        }

        // Extract resource info from request body or params
        let targetResource = null;
        let targetResourceType = null;
        let changes = null;

        // Try to get resource ID from params
        if (req.params.id) {
          targetResource = req.params.id;
        }

        // Try to get resource name/type from body or response
        if (req.body) {
          if (req.body.order_number) {
            targetResource = req.body.order_number;
            targetResourceType = 'Order';
          } else if (req.body.email) {
            targetResource = req.body.email;
            targetResourceType = 'User';
          } else if (req.body.client_name) {
            targetResource = req.body.client_name;
            targetResourceType = 'Client';
          } else if (req.body.product_name || req.body.name) {
            targetResource = req.body.product_name || req.body.name;
            targetResourceType = 'Product';
          } else if (req.body.material_id || req.body.id) {
            targetResource = req.body.material_id || req.body.id;
          } else if (req.body.name) {
            targetResource = req.body.name;
          }
        }

        // Get resource info from response data
        if (responseData?.data) {
          const data = responseData.data;
          if (data.product_id || data.id) {
            targetResource = data.product_id || data.id;
            targetResourceType = 'Product';
            if (data.name) {
              targetResource = `${data.name} (${targetResource})`;
            }
          } else if (data.material_id) {
            targetResource = data.material_id;
            targetResourceType = 'Material';
            if (data.name) {
              targetResource = `${data.name} (${targetResource})`;
            }
          } else if (data.order_number) {
            targetResource = data.order_number;
            targetResourceType = 'Order';
          }
        }

        // Store detailed changes for update operations
        if ((req.method === 'PUT' || req.method === 'PATCH') && responseData?.data) {
          // If response contains changes object, use it
          if (responseData.data.changes) {
            changes = responseData.data.changes;
          } else if (req.body) {
            // Build changes from request body (what was sent to update)
            changes = {};
            Object.keys(req.body).forEach(key => {
              // Skip internal fields
              if (!['_id', '__v', 'created_at', 'updated_at', 'created_by'].includes(key)) {
                changes[key] = {
                  new: req.body[key]
                };
              }
            });
          }
        }

        // Get error message if request failed
        let errorMessage = null;
        if (statusCode >= 400) {
          errorMessage = responseData?.error || responseData?.message || 'Request failed';
        }

        // Build detailed description
        let description = routeConfig.description;
        
        // For updates, show what was changed
        if ((req.method === 'PUT' || req.method === 'PATCH') && changes && Object.keys(changes).length > 0) {
          const changedFields = Object.keys(changes).filter(key => {
            const change = changes[key];
            // Show field if it has old/new values or just new value
            return change && (change.old !== undefined || change.new !== undefined);
          });
          
          if (changedFields.length > 0) {
            const fieldDescriptions = changedFields.slice(0, 5).map(key => {
              const change = changes[key];
              if (change.old !== undefined && change.new !== undefined) {
                return `${key}: "${change.old}" → "${change.new}"`;
              } else if (change.new !== undefined) {
                return `${key}: "${change.new}"`;
              }
              return key;
            });
            
            const moreFields = changedFields.length > 5 ? ` and ${changedFields.length - 5} more` : '';
            description = `${routeConfig.description}: Changed ${fieldDescriptions.join(', ')}${moreFields}`;
            
            if (targetResource) {
              description = `${routeConfig.description} "${targetResource}": Changed ${fieldDescriptions.join(', ')}${moreFields}`;
            }
          } else if (targetResource) {
            description = `${routeConfig.description}: ${targetResourceType || 'Resource'} "${targetResource}"`;
          }
        } else if (targetResource && targetResourceType) {
          description = `${routeConfig.description}: ${targetResourceType} "${targetResource}"`;
        } else if (targetResource) {
          description = `${routeConfig.description}: "${targetResource}"`;
        }

        // Only create log if we have meaningful data
        // Skip if no resource info and no changes for non-CREATE actions
        if (!targetResource && 
            !changes && 
            !routeConfig.action.includes('CREATE')) {
          // Still log if it's a meaningful action with response data
          if (!responseData?.data) {
            return; // Skip if no meaningful data
          }
        }

        // Create activity log
        const logData = {
          ...userInfo,
          action: routeConfig.action,
          action_category: routeConfig.category,
          description,
          method: req.method,
          endpoint: req.path,
          ip_address: getIpAddress(req),
          user_agent: req.headers['user-agent'] || 'unknown',
          status_code: statusCode,
          response_time: responseTime,
          target_resource: targetResource,
          target_resource_type: targetResourceType,
          changes,
          error_message: errorMessage,
          metadata: {
            query: req.query,
            path_params: req.params
          }
        };

        const log = await createActivityLog(logData);

        // Emit to Socket.IO for real-time updates (only to admin room)
        if (log && io) {
          io.to('admin-logs').emit('new-activity', {
            _id: log._id,
            user_name: log.user_name,
            user_email: log.user_email,
            user_role: log.user_role,
            action: log.action,
            action_category: log.action_category,
            description: log.description,
            method: log.method,
            endpoint: log.endpoint,
            status_code: log.status_code,
            response_time: log.response_time,
            target_resource: log.target_resource,
            target_resource_type: log.target_resource_type,
            changes: log.changes,
            metadata: log.metadata,
            created_at: log.created_at,
            ip_address: log.ip_address
          });
        }
      } catch (error) {
        console.error('Error in activity log middleware:', error);
        // Don't break the request flow if logging fails
      }
    });

    next();
  };
};
