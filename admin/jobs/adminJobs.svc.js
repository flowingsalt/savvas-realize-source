angular.module('Realize.admin.adminJobsService', [
        'Realize.paths',
        'Realize.admin.jobs.jobModel',
        'Realize.common.helpers'
    ])
    .service('AdminJobsService', [
        '$q',
        '$http',
        'PATH',
        'Job',
        'RealizeHelpers',
        function($q, $http, PATH, Job, RealizeHelpers) {
            'use strict';

            this.getJobs = function(query) {
                var url = PATH.REST + '/jobs';

                query = query || {};

                return $http.get(url, {
                    params: query
                }).then(function(response) {
                    var jobs = [];
                    // currently server is returning as object
                    angular.forEach(response.data, function(jobData, jobId) {
                        jobs.push(new Job(jobId, jobData));
                    });

                    return jobs;
                }, function(response) {
                    return $q.reject(response.data);
                });
            };

            this.getJobById = function(jobId, fullDetails) {
                var url = PATH.REST + '/jobs/' + jobId,
                    query = {
                        getMinimalJobDetailsAttributes: !fullDetails
                    };

                return $http.get(url, {
                    params: query
                }).then(function(response) {
                    var jobs = [];
                    // currently server is returning as object
                    angular.forEach(response.data, function(jobData, jobId) {
                        jobs.push(new Job(jobId, jobData));
                    });

                    return jobs;
                }, $q.reject);
            };

            this.getLogUrl = function(jobIds) {
                if (!angular.isArray(jobIds)) {
                    jobIds = [jobIds];
                }

                var url = PATH.REST + '/jobs/logs';

                return RealizeHelpers.buildUrl(url, {
                    jobIds: jobIds
                });
            };
        }
    ]);
