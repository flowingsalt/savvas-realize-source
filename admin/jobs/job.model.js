angular
    .module('Realize.admin.jobs.jobModel', [])
    .factory('Job', [
        function() {
            'use strict';
            var Job = function(jobId, json) {
                this._initializationData = angular.extend({
                    completed: false,
                    jobStatus: ''
                }, json);
                //completed comes boolean and as well as a string..
                this.completed = angular.isString(this._initializationData.completed) ?
                    (json.completed || '').split('||').pop().toLowerCase() === 'true'
                    : this._initializationData.completed;
                this.formattedJobStatus = (this._initializationData.jobStatus || '').toLowerCase();
                var statusList = this.formattedJobStatus.split('||');
                this.formattedJobStatus = statusList[0] === 'completed' ? statusList.pop() : statusList[0];
                this.jobId = jobId;
            };
            Object.defineProperties(Job.prototype, {
                'jobType': {
                    get: function() {
                        return this._initializationData.jobName;
                    }
                },
                'hasErrors': {
                    get: function() {
                        return this.formattedJobStatus === 'completed with exception' ||
                            this.formattedJobStatus === 'terminated' ||
                            !!this._initializationData.exception;
                    }
                },
                'exception': {
                    get: function() {
                        return this._initializationData.exception;
                    }
                },
                'errors': {
                    get: function() {
                        return this._initializationData.errors;
                    }
                },
                'isCompleted': {
                    get: function() {
                        return this.completed;
                    }
                },
                'isNotStarted' : {
                    get: function() {
                        return this.formattedJobStatus === 'not started';
                    }
                },
                'status': {
                    get: function() {
                        return this.formattedJobStatus;
                    }
                },
                'submittedBy': {
                    get: function() {
                        return this._initializationData.jobSubmittedBy;
                    }
                },
                'dateStarted': {
                    get: function() {
                        return moment(this._initializationData.startTime);
                    }
                },
                'dateCompleted': {
                    get: function() {
                        return moment(this._initializationData.completionTime);
                    }
                },
                'programs': {
                    get: function() {
                        if (this._initializationData.importType === 'library') {
                            return this.taxonomyName;
                        }
                        return this._initializationData.libraries;
                    }
                },
                'progress': {
                    get: function() {
                        if (this._initializationData.itemsProcessed && this._initializationData.itemsToProcess) {
                            return this._initializationData.itemsProcessed + '/' +
                                this._initializationData.itemsToProcess;
                        }
                        if (this._initializationData.itemPublished) {
                            return this._initializationData.itemPublished;
                        }
                        return false;
                    }
                },
                'fileName': {
                    get: function() {
                        return this._initializationData.fileName;
                    }
                },
                'duration': {
                    get: function() {
                        if (!this.dateCompleted) {
                            return null;
                        }
                        return moment.duration(this.dateCompleted.diff(this.dateStarted)).humanize();
                    }
                },
                'importType': {
                    get: function() {
                        return this._initializationData.importType;
                    }
                },
                'taxonomyName': {
                    get: function() {
                        return this._initializationData.taxonomyName;
                    }
                }
            });
            return Job;
        }
    ]);
