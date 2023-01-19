angular.module('Realize.admin.jobs.adminJobsListingController', [
        'rlzComponents.components.i18n',
        'Realize.admin.adminJobsService',
        'Realize.user.currentUser',
        'Realize.common.DateRangeSelector',
        'admin.jobs.programMetadataFilter',
        'ModalServices',
        'Realize.filters.underscores',
        'Realize.filters.underscoreToCamelCase',
        'Realize.filters.strReplace'
    ])
    .controller('AdminJobsListingController', [
        '$scope',
        '$log',
        'AdminJobsService',
        'JobsData',
        '$currentUser',
        'Modal',
        'lwcI18nFilter',
        'lastSearch',
        '$location',
        'strReplaceFilter',
        function($scope, $log, AdminJobsService, JobsData, $currentUser, Modal, lwcI18nFilter, lastSearch, $location,
            strReplaceFilter) {
            'use strict';

            this.locationFallback = '/admin/patools';

            this.jobs = JobsData;

            this.jobTypeReplace = /_/g;

            this.filters = {
                state: 'active',
                JOB_NAME: 'all',
                SUBMITTED_BY_USERID: $currentUser.userName,
                getMinimalJobDetailsAttributes: true
            };

            this.lastSearch = lastSearch;

            this.dateRangeOptions = [{
                id: 'all',
                analyticLabel: 'All',
                label: 'dateRangeSelector.filter.rangeOption.all',
                order: 1,
                default: true
            }, {
                id: 'yesterday',
                analyticLabel: 'Yesterday',
                label: 'dateRangeSelector.filter.rangeOption.yesterday',
                order: 2
            }, {
                id: 'today',
                analyticLabel: 'Today',
                label: 'dateRangeSelector.filter.rangeOption.today',
                order: 3
            }, {
                id: 'last7Days',
                analyticLabel: 'Last 7 days',
                label: 'dateRangeSelector.filter.rangeOption.last7Days',
                order: 4
            }, {
                id: 'last14Days',
                analyticLabel: 'Last 14 days',
                label: 'dateRangeSelector.filter.rangeOption.last14Days',
                order: 5
            }];

            Object.defineProperty(this, 'zeroStateMessage', {
                get: function() {
                    return (this.lastSearch && this.lastSearch.type === 'id') ?
                        'jobSelector.zeroState.idNotFound' : 'jobSelector.zeroState.filtersNotFound';
                }
            });

            this.search = function() {
                var ctrl = this,
                    sendFilters = angular.copy(this.filters);

                if (sendFilters.JOB_NAME === 'all') {
                    delete sendFilters.JOB_NAME;
                }

                if (sendFilters.DATE_COMPLETED) {
                    if (sendFilters.DATE_COMPLETED.id !== 'all') {
                        sendFilters.DATE_COMPLETED_START = moment(sendFilters.DATE_COMPLETED.startDate).format();
                        sendFilters.DATE_COMPLETED_END = moment(sendFilters.DATE_COMPLETED.endDate).format();
                    }
                    delete sendFilters.DATE_COMPLETED;
                }

                if (sendFilters.state === 'completed') {
                    // for the current scope, we limit all queries to 24hrs
                    sendFilters.DATE_COMPLETED_START = moment().add(-24, 'hours').format();
                    sendFilters.DATE_COMPLETED_END = moment().format();
                }

                // don't send empty string
                if (!sendFilters.SUBMITTED_BY_USERID) {
                    delete sendFilters.SUBMITTED_BY_USERID;
                }

                if (!sendFilters.LIBRARIES) {
                    delete sendFilters.LIBRARIES;
                }

                ctrl.isLoading = true;

                AdminJobsService.getJobs(sendFilters)
                    .then(function(jobs) {
                        ctrl.jobs = jobs;
                    }, function(err) {
                        $log.debug('error getting jobs!', err);
                        ctrl.jobs = [];
                    })
                    .finally(function() {
                        ctrl.isLoading = false;
                        ctrl.lastSearch = {
                            type: 'filters',
                            filters: angular.copy(sendFilters)
                        };
                    });
            };

            this.searchById = function() {
                var ctrl = this;

                $location.path('/admin/patools/jobservicelisting/' + ctrl.searchId);
            };

            this.sortBy = function(sortKey) {
                if (this.sortKey === sortKey) {
                    // toggle the sortDirection
                    if (this.sortDirection === '+') {
                        this.sortDirection = '-';
                    } else {
                        this.sortDirection = '+';
                    }
                } else {
                    this.sortDirection = '+';
                }
                this.sortKey = sortKey;

                this.sortListingBy = this.sortDirection + this.sortKey;
            };

            this.getDownloadLogUrl = function(logIds) {
                return AdminJobsService.getLogUrl(logIds);
            };

            this.getDownloadAllLogsUrl = function() {
                var logIds = [];
                angular.forEach(this.jobs, function(job) {
                    if (job.isCompleted) {
                        logIds.push(job.jobId);
                    }
                });

                return AdminJobsService.getLogUrl(logIds);
            };

            this.showErrorsModal = function(job) {
                var jobTitle = strReplaceFilter(job.jobType, this.jobTypeReplace),
                    title = lwcI18nFilter('jobSelector.errorModal.title', [jobTitle]) + ' (' + job.jobId + ')',
                    body = '<textarea>' + job.exception + '</textarea>';

                Modal.simpleDialog(title, body);
            };

            this.isJobCompleted =  function(job) {
                return job.isCompleted && !job.hasErrors && !isPending(job);
            };

            this.jobHasErrors = function(job) {
                return job.isCompleted && job.hasErrors;
            };

            this.isJobAwaiting = function(job) {
                return job.isCompleted && isPending(job);
            };

            var isPending = function(job) {
                return job.formattedJobStatus === 'pending scheduled refresh';
            };

            this.isJobProcessing = function(job) {
                return !job.isCompleted && !job.progress && !job.isNotStarted;
            };
        }
    ]);
