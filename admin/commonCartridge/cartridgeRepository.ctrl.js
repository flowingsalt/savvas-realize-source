angular.module('Realize.admin.commonCartridge.cartridgeRepositoryController', [
    'Realize.common.DateRangeSelector',
    'RealizeDataServices',
    'Realize.paths',
    'Realize.admin.commonCartridge.supportedVersions',
    'Realize.admin.commonCartridge.cartridgeDataService'
])
    .controller('CartridgeRepositoryCtrl', [
        '$scope',
        '$timeout',
        'Analytics',
        'ProgramService',
        'PATH',
        'lwcI18nFilter',
        'CommonCartridgeDataSvc',
        'SUPPORTED_CARTRIDGE_VERSIONS',
        function CCRepoCtrl($scope, $timeout, Analytics, ProgramService, PATH, lwcI18nFilter, CommonCartridgeDataSvc,
            SUPPORTED_CARTRIDGE_VERSIONS) {

            'use strict';

            var ctrl = this,
                fullCartridgeList,
                fullProgramsList,
                STATUS_MAP = {
                    ALL: {
                        label: lwcI18nFilter('commonCartridgeAdmin.cartridgeRepository.statusFilterOpts.all'),
                        isAll: true
                    },
                    IN_PROGRESS: {
                        label: lwcI18nFilter('commonCartridgeAdmin.cartridgeRepository.statusFilterOpts.inProgress'),
                        value: 'IN_PROGRESS'
                    },
                    SUCCESS: {
                        label: lwcI18nFilter('commonCartridgeAdmin.cartridgeRepository.statusFilterOpts.success'),
                        value: 'COMPLETE'
                    },
                    FAIL: {
                        label: lwcI18nFilter('commonCartridgeAdmin.cartridgeRepository.statusFilterOpts.fail'),
                        value: 'ERROR'
                    },
                    POTENTIAL_ISSUES: {
                        label:
                            lwcI18nFilter('commonCartridgeAdmin.cartridgeRepository.statusFilterOpts.potentialIssues'),
                        value: 'POTENTIAL_ISSUES'
                    }
                },
                commonDateFormat = 'MM/DD/YYYY',
                timer;

            function compileCartridgeProgramList() {
                if (!(fullCartridgeList && fullProgramsList)) {
                    return;
                }

                function findMatchingProgram(cartridge) {
                    var matchByIdAndVersion = fullProgramsList.filter(function(p) {
                        return p.id === cartridge.programId && p.version === cartridge.programVersion;
                    })[0];

                    if (matchByIdAndVersion) {
                        return matchByIdAndVersion;
                    } else {
                        return fullProgramsList.filter(function(p) {
                            return p.id === cartridge.programId && p.version > cartridge.programVersion;
                        }).sort(function(a, b) {
                            return a.version - b.version;
                        })[0];
                    }
                }

                fullCartridgeList.forEach(function(c) {
                    var program = findMatchingProgram(c) || {};
                    c.programName = program.title;
                    c.programState = program.stateCode;
                    c.dateExported = moment(c.dateExported);
                    c.fileName = c.fileName || '';
                });

                ctrl.applyFilter();
                ctrl.uiState.isFinishedLoading = true;
            }

            ProgramService.getAllStatePrograms()
                .then(function gotPrograms(response) {
                    fullProgramsList = response.results;
                    compileCartridgeProgramList();
                });

            CommonCartridgeDataSvc.listCartridges().then(function(response) {
                fullCartridgeList = response.data;
                ctrl.pagerData.totalItems = fullCartridgeList.length;
                compileCartridgeProgramList();
            }).catch(function() {
                $scope.pageLoaded();
            });

            this.downloadPaths = {
                cartridge: [PATH.REST, 'commoncartridge'].join('/'),
                log: [PATH.REST, 'commoncartridge', 'log'].join('/')
            };

            this.possibleExportStatuses = [
                STATUS_MAP.ALL,
                STATUS_MAP.IN_PROGRESS,
                STATUS_MAP.SUCCESS,
                STATUS_MAP.FAIL,
                STATUS_MAP.POTENTIAL_ISSUES
            ];

            this.possibleCartridgeVersions = [
                {
                    description: lwcI18nFilter('commonCartridgeAdmin.cartridgeRepository.versionFilterOpts.any'),
                    isAll: true
                }
            ].concat(SUPPORTED_CARTRIDGE_VERSIONS);

            this.uiState = {
                canUpdateFilter: true,
                isFilterUpdating: false,
                isFinishedLoading: false
            };

            this.filterData = $scope.filterData = {
                programSearchText: '',
                dateRange: {},
                status: this.possibleExportStatuses[0],
                version: this.possibleCartridgeVersions[0]
            };

            this.sortField = '-dateExported';

            this.sortBy = function(fieldName) {
                if (this.sortField.substr(1) === fieldName) {
                    var sign = this.sortField[0] === '+' ? '-' : '+';
                    this.sortField = sign + fieldName;
                } else {
                    this.sortField = '+' + fieldName;
                }
            };

            $scope.currentPage = 1;
            this.pagerData = $scope.pagerData = {
                startIndex: 0,
                endIndex: 9,
                pageSize: 10,
                get currentPage() {
                    return $scope.currentPage;
                },
                set currentPage(num) {
                    $scope.currentPage = num;
                },
                totalItems: 0
            };

            this.filteredResults = [];

            this.setStatusFilter = function(status) {
                this.filterData.status = status;
            };

            this.setVersionFilter = function(version) {
                this.filterData.version = version;
            };

            this.applyFilter = function() {
                this.uiState.isFilterUpdating = true;

                timer = $timeout(function() {
                    this.pagerData.startIndex = 0;
                    this.pagerData.endIndex = this.pagerData.pageSize - 1;
                    this.pagerData.currentPage = 1;

                    var filterProgram = this.filterData.programSearchText,
                        filterStatus = this.filterData.status,
                        filterVersion = this.filterData.version,
                        filterStartDate = this.filterData.dateRange.startDate,
                        filterStartDateFormatted,
                        filterEndDate = this.filterData.dateRange.endDate,
                        filterEndDateFormatted,
                        filterByProgram = filterProgram.length > 0,
                        filterByStatus = !filterStatus.isAll,
                        filterByVersion = !filterVersion.isAll,
                        filterByDate = angular.isDefined(filterStartDate) && angular.isDefined(filterEndDate);

                    if (filterByDate) {
                        filterStartDateFormatted = moment(filterStartDate).format(commonDateFormat);
                        filterEndDateFormatted = moment(filterEndDate).format(commonDateFormat);
                    }

                    this.filteredResults = fullCartridgeList.filter(function(c) {
                        var passesProgramFilter = !filterByProgram ||
                                (c.programName || '').toLowerCase().indexOf(filterProgram.toLowerCase()) !== -1,
                            passesStatusFilter = !filterByStatus || c.status === filterStatus.value,
                            passesVersionFilter = !filterByVersion || c.ccVersion === filterVersion.description,
                            passesDateFilter = !filterByDate ||
                                ((c.dateExported.format(commonDateFormat) === filterStartDateFormatted ||
                                    c.dateExported.isAfter(filterStartDate)
                                ) &&
                                (c.dateExported.format(commonDateFormat) === filterEndDateFormatted ||
                                    c.dateExported.isBefore(filterEndDate))
                                );

                        return passesProgramFilter && passesDateFilter && passesVersionFilter && passesStatusFilter;
                    }, 50);

                    this.pagerData.totalItems = this.filteredResults.length;
                    if (this.pagerData.totalItems < this.pagerData.pageSize) {
                        this.pagerData.endIndex = this.pagerData.totalItems - 1;
                    }
                    this.uiState.isFilterUpdating = false;
                }.bind(this));
            };

            this.deleteCartridge = function(cc) {
                if (cc.status !== STATUS_MAP.IN_PROGRESS.value) {
                    CommonCartridgeDataSvc.deleteCartridge(cc.ccId).then(function() {
                        cc.active = false;
                    });
                }
            };

            this.undeleteCartridge = function(cc) {
                CommonCartridgeDataSvc.undeleteCartridge(cc.ccId).then(function() {
                    cc.active = true;
                });
            };

            function setCanUpdateFilter() {
                ctrl.uiState.canUpdateFilter = ctrl.filterData.dateRange.startDate && ctrl.filterData.dateRange.endDate;
            }

            function dateFilterUpdated(range) {
                if (range && range.startDate && range.endDate) {
                    ctrl.filterData.startDateFormatted = moment(range.startDate).format(commonDateFormat);
                    ctrl.filterData.endDateFormatted = moment(range.endDate).format(commonDateFormat);
                    Analytics.track('track.action', {
                        category: 'Data',
                        action: 'Change Calendar Range'
                    });
                }

                setCanUpdateFilter();
            }

            $scope.$watch('filterData.dateRange', function(oldVal, newVal) {
                dateFilterUpdated(newVal);
            }, true);

            $scope.$on('dateRangeSelector.selection.change', function(evt, newVal, range) {
                dateFilterUpdated(range);
            });

            $scope.$watch('currentPage', function() {
                ctrl.pagerData.startIndex = (ctrl.pagerData.currentPage - 1) * ctrl.pagerData.pageSize;
                ctrl.pagerData.endIndex = (ctrl.pagerData.currentPage * ctrl.pagerData.pageSize) - 1;

                if (ctrl.pagerData.totalItems < ctrl.pagerData.endIndex + 1) {
                    ctrl.pagerData.endIndex = ctrl.pagerData.totalItems - 1;
                }
            }, true);

            $scope.$on('$destroy', function destroy() {
                $timeout.cancel(timer);
            });
        }
    ]);
