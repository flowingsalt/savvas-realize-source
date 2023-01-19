angular.module('Realize.assignment.viewOptions', [
    'Realize.user.currentUser',
    'Realize.common.DateRangeSelectorService',
    'Realize.common.browserInfoService',
    'Realize.assignment.constants'
])
    .service('AssignmentViewOptions', [
        '$log',
        '$currentUser',
        'DateRangeSelectorService',
        'BrowserInfo',
        'ASSIGNMENT_CONSTANTS',
        function($log, $currentUser, DateRangeSelectorService, BrowserInfo, ASSIGNMENT_CONSTANTS) {
            'use strict';

            var service = this,
                defaultFilters = {
                    view: ASSIGNMENT_CONSTANTS.EVERYONE,
                    graded: ASSIGNMENT_CONSTANTS.GRADE_TYPE.ALL
                },
                defaultSortOptions = {
                    page: 1,
                    sortField: ASSIGNMENT_CONSTANTS.DUE_DATE,
                    sortOrder: ASSIGNMENT_CONSTANTS.DESC,
                    assignmentStatus: ASSIGNMENT_CONSTANTS.AVAILABLE,
                    pageSize: BrowserInfo.isMobileDevice ?
                        ASSIGNMENT_CONSTANTS.PAGE_SIZE.MOBILE : ASSIGNMENT_CONSTANTS.PAGE_SIZE.DESKTOP
                },
                getClassIdKey = function(classId, isHidden) {
                    return isHidden ? classId + '.hidden' : classId;
                },
                saveUserAttribute = function(classId, attributeKey, attributeValue, persist) {
                    var userAttribute = $currentUser.getAttribute(attributeKey) || {};
                    userAttribute[classId] = attributeValue;
                    $currentUser.setAttribute(attributeKey, userAttribute, persist);
                };

            service.getDefaultFilter = function(classId) {
                var classIdKey = getClassIdKey(classId, false),
                    existingFilters = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.FILTER_STATE_KEY) || {},
                    existingSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.SORT_STATE_KEY) || {},
                    dateRange = DateRangeSelectorService.getSavedDateRange($currentUser,
                        ASSIGNMENT_CONSTANTS.CLASS_DATE_RANGE),
                    existingClassSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_BYCLASS_KEY) || {};
                return angular.extend({},
                    defaultFilters, existingFilters[classId], defaultSortOptions, existingSort[classIdKey],
                    existingClassSort, {
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate,
                        includeIfNoAssignees: false
                    });
            };

            service.getDefaultFilterForHidden = function(classId) {
                var classIdKey = getClassIdKey(classId, true),
                    existingSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.SORT_STATE_KEY) || {},
                    existingClassSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_BYCLASS_KEY) || {};
                return angular.extend({}, defaultSortOptions, existingSort[classIdKey], existingClassSort, {
                    assignmentStatus: ASSIGNMENT_CONSTANTS.INACTIVE
                });
            };

            service.saveSortOptions = function(classId, requestFilter, isHiddenView) {
                var classIdKey = getClassIdKey(classId, isHiddenView);
                saveUserAttribute(classIdKey, ASSIGNMENT_CONSTANTS.SORT_STATE_KEY, {
                    sortField: requestFilter.sortField,
                    sortOrder: requestFilter.sortOrder,
                    page: requestFilter.page
                }, false);
            };

            service.saveFilterOptions = function(classId, requestFilter) {
                saveUserAttribute(classId, ASSIGNMENT_CONSTANTS.FILTER_STATE_KEY, {
                    view: requestFilter.view,
                    graded: requestFilter.graded,
                }, true);
            };

            service.getUpdatedFilter = function(classId, searchFilters) {
                var classIdKey = getClassIdKey(classId, false),
                    existingSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.SORT_STATE_KEY) || {},
                    existingClassSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_BYCLASS_KEY) || {};
                return angular.extend({}, defaultSortOptions, existingSort[classIdKey], existingClassSort, {
                    assignmentStatus: ASSIGNMENT_CONSTANTS.AVAILABLE,
                    includeIfNoAssignees: false,
                    startDate: searchFilters.dateRange.startDate,
                    endDate: searchFilters.dateRange.endDate,
                    view: searchFilters.viewing.toUpperCase(),
                    graded: searchFilters.grade.toUpperCase() === ASSIGNMENT_CONSTANTS.NOTGRADED ?
                        ASSIGNMENT_CONSTANTS.NOT_GRADED : searchFilters.grade.toUpperCase()
                });
            };

            service.getDefaultStudentFilter = function() {
                return angular.extend({}, defaultSortOptions);
            };

            service.getStudentFilterByStatus = function(status) {
                var existingSort;
                if (status === ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED) {
                    existingSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_STATUS.NOT_STARTED) || {};
                    return angular.extend({}, defaultSortOptions, {sortOrder: ASSIGNMENT_CONSTANTS.ASC}, existingSort);
                } else if (status === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS) {
                    existingSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_STATUS.IN_PROGRESS) || {};
                    return angular.extend({}, defaultSortOptions, {sortOrder: ASSIGNMENT_CONSTANTS.ASC}, existingSort);
                } else if (status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED) {
                    existingSort = $currentUser.getAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_STATUS.COMPLETED) || {};
                    return angular.extend({}, defaultSortOptions, existingSort);
                }
                return angular.extend({}, defaultSortOptions, existingSort);
            };
        }
    ]);
