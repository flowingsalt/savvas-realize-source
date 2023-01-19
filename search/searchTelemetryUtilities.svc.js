angular.module('Realize.search.telemetry', [
    'Realize.constants.searchTelemetryEvent',
    'rlzComponents.components.telemetry.constants',
])
    .service('searchTelemetryUtilitiesService', [
        '$location',
        'telemetryService',
        'baseTelemetryEvents',
        'SEARCH_TELEMETRY_EVENT',
        'DRA_TELEMETRY',
        'TELEMETRY_FACETS_CONSTANTS',
        'TELEMETRY_CONSTANTS',
        function($location, telemetryService, baseTelemetryEvents, SEARCH_TELEMETRY_EVENT,
            DRA_TELEMETRY, TELEMETRY_FACETS_CONSTANTS, TELEMETRY_CONSTANTS) {
            'use strict';

            this.sendTelemetryEventsFromSearch = function(event, breadcrumbData, pageInfo) {
                var clickBreadcrumbItemText = event.currentTarget.text;
                var searchResultBreadcrumbObjectEvent = {
                    extensions: {
                        area: getAreaOfBreadcrumb(),
                        page: getPageOfBreadcrumb(),
                        product: getRootOfBreadcrumbHierarchy(breadcrumbData),
                        description: getLevelOfHierarchicalPath(clickBreadcrumbItemText, breadcrumbData),
                        value: getBreadCrumbValue(breadcrumbData),
                    },
                    definition: {
                        name: SEARCH_TELEMETRY_EVENT.NAME
                    },
                };
                searchResultBreadcrumbObjectEvent.extensions['sub-page'] = pageInfo === 'infoModal' ?
                SEARCH_TELEMETRY_EVENT.INFORMATION_MODAL : '';
                var activityDetails = baseTelemetryEvents.createEventData(
                    SEARCH_TELEMETRY_EVENT.OPEN,
                    searchResultBreadcrumbObjectEvent
                );
                telemetryService.sendTelemetryEvent(activityDetails);
            };

            this.sendTelemetryEventsFromMoreOrLess = function(toggleText, breadcrumbList) {
                var toggleBreadcrumbTelemteryObject = {
                    extensions: {
                        area: getAreaOfBreadcrumb(),
                        page: getPageOfBreadcrumb(),
                        product: getRootOfMultipleBreadcrumbHierarchy(breadcrumbList),
                        description: SEARCH_TELEMETRY_EVENT.DESCRIPTION + ' ' + breadcrumbList.length,
                        value: getCompleteBreadCrumb(breadcrumbList),
                    },
                    definition: {
                        name: toggleText === SEARCH_TELEMETRY_EVENT.MORE_TEXT ? SEARCH_TELEMETRY_EVENT.MORE :
                        SEARCH_TELEMETRY_EVENT.LESS
                    },
                };
                var activityDetails = baseTelemetryEvents.createEventData(
                    toggleText === SEARCH_TELEMETRY_EVENT.MORE_TEXT ? SEARCH_TELEMETRY_EVENT.OPEN :
                    SEARCH_TELEMETRY_EVENT.CLOSE,
                    toggleBreadcrumbTelemteryObject
                );
                telemetryService.sendTelemetryEvent(activityDetails);
            };

            this.sendTelemetryEventsFromCreateAssignment = function(programHierarchy, contentMediaType) {
                var hierarchyDetails = getHierarchyForTelemtery(programHierarchy);
                var createAssignmentTelemteryObject = {
                    extensions: {
                        area: $location.path().indexOf('/program') !== -1 ? SEARCH_TELEMETRY_EVENT.PROGRAM_DATA :
                            SEARCH_TELEMETRY_EVENT.SEARCH_DATA,
                        page: $location.path().indexOf('/program') !== -1 ? '' :
                            SEARCH_TELEMETRY_EVENT.PAGE_TYPE.SEARCH_PAGE,
                        product: hierarchyDetails.length > 0 ? getRootOfBreadcrumbHierarchy(hierarchyDetails) : '',
                        description: contentMediaType,
                        value: hierarchyDetails.length > 0 ? getBreadCrumbValue(hierarchyDetails) : '',
                    },
                    definition: {
                        name: SEARCH_TELEMETRY_EVENT.ASSIGN
                    },
                };
                createAssignmentTelemteryObject.extensions['sub-page'] = SEARCH_TELEMETRY_EVENT.
                    PAGE_TYPE.CREATE_AN_ASSIGNMENT;
                var activityDetails = baseTelemetryEvents.createEventData(
                    SEARCH_TELEMETRY_EVENT.ADD,
                    createAssignmentTelemteryObject
                );
                telemetryService.sendTelemetryEvent(activityDetails);
            };
            this.sendTelemetryEventsFromSearchButton = function(keywords) {
                var searchPerformTelemteryObject = {
                    extensions: {
                        area: SEARCH_TELEMETRY_EVENT.SEARCH_DATA,
                        page: SEARCH_TELEMETRY_EVENT.PAGE_TYPE.SEARCH_PAGE,
                        value: keywords,
                    },
                    definition: {
                        name: SEARCH_TELEMETRY_EVENT.SEARCH_DATA
                    },
                };
                var activityDetails = baseTelemetryEvents.createEventData(
                    SEARCH_TELEMETRY_EVENT.SEARCH_DATA,
                    searchPerformTelemteryObject
                );
                telemetryService.sendTelemetryEvent(activityDetails);
            };

            this.sendTelemetryEventForBrowse = function(extensionPage, extensionDescription,
                extensionName, extensionValue, extensionArea) {
                var filterValue = TELEMETRY_FACETS_CONSTANTS.FACET.FILTER;
                var sendTelemetryEventForBrowseObject = {
                    extensions: {
                        area: extensionArea,
                        page: extensionPage,
                        product: TELEMETRY_CONSTANTS.NO_PROGRAM_AVAILABLE,
                        description: extensionDescription,
                        value: extensionValue,
                    },
                    definition: {
                        name: extensionName + ' ' + filterValue
                    },
                };
                sendTelemetryEventForBrowseObject.extensions['sub-page'] =
                    TELEMETRY_FACETS_CONSTANTS.FACET.FACET_PANEL;
                var activityDetails = baseTelemetryEvents.createEventData(
                    filterValue,
                    sendTelemetryEventForBrowseObject
                );
                telemetryService.sendTelemetryEvent(activityDetails);
            };

            this.sendTelemetryEventForDra = function(extensionDescription,
                extensionName, extensionValue, productTitle, startValue, endValue) {
                var searchRange = (startValue !== endValue) ? (startValue + '-' + endValue) : startValue;
                var sendTelemetryEventForDraObject = {
                    extensions: {
                        area: TELEMETRY_CONSTANTS.EVENT_TYPE.PROGRAMS,
                        page: DRA_TELEMETRY.LEVELED_READERS,
                        'sub-page': TELEMETRY_FACETS_CONSTANTS.FACET.FACET_PANEL,
                        product: productTitle,
                        description: extensionDescription,
                        value: extensionValue,
                        LeveledReaderType: DRA_TELEMETRY.DRA,
                        LeveledReaderScale: searchRange,
                    },
                    definition: {
                        name: extensionName
                    },
                };
                var activityDetails = baseTelemetryEvents.createEventData(
                    TELEMETRY_FACETS_CONSTANTS.FACET.FILTER,
                    sendTelemetryEventForDraObject);
                telemetryService.sendTelemetryEvent(activityDetails);
            };

            var getHierarchyForTelemtery = function(programHierarchy) {
                var hierarchyDetails = [];
                if (programHierarchy && programHierarchy.length > 0) {
                    _.forEach(programHierarchy, function(hierarchy) {
                        if (hierarchy.containerTitle) {
                            var hierarchyItem = {
                                title: hierarchy.containerTitle
                            };
                            hierarchyDetails.push(hierarchyItem);
                        }
                    });
                }
                return hierarchyDetails.reverse();
            };

            var getAreaOfBreadcrumb = function() {
                if ($location.path().match(/\/(resources|standards|leveledreaders)/)) {
                    return SEARCH_TELEMETRY_EVENT.PROGRAM_DATA;
                } else {
                    return SEARCH_TELEMETRY_EVENT.SEARCH_DATA;
                }
            };

            var getRootOfBreadcrumbHierarchy = function(breadcrumbData) {
                return breadcrumbData[0].title;
            };

            var getRootOfMultipleBreadcrumbHierarchy = function(breadcrumbList) {
                var breadcrumb = breadcrumbList[0];
                var rootOfBreadcrumb = breadcrumb[0];
                return rootOfBreadcrumb.title;
            };

            var getPageOfBreadcrumb = function() {
                if ($location.path().match(/\/resources/)) {
                    return SEARCH_TELEMETRY_EVENT.PAGE_TYPE.RESOURCES_PAGE;
                } else if ($location.path().match(/\/standards/)) {
                    return SEARCH_TELEMETRY_EVENT.PAGE_TYPE.STANDARDS_PAGE;
                } else if ($location.path().match(/\/leveledreaders/)) {
                    return SEARCH_TELEMETRY_EVENT.PAGE_TYPE.LEAVELED_READERS_PAGE;
                } else {
                    return SEARCH_TELEMETRY_EVENT.PAGE_TYPE.SEARCH_PAGE;
                }
            };

            var getLevelOfHierarchicalPath = function(clickBreadcrumbItemText, breadcrumbData) {
                var breadcrumbItemLevel;
                var breadcrumbLength = breadcrumbData.length;
                var levelCheck = getIndexOfBreadcrumb(clickBreadcrumbItemText, breadcrumbData);
                if (levelCheck === 0 && breadcrumbLength === 1) {
                    breadcrumbItemLevel = SEARCH_TELEMETRY_EVENT.LEVEL_TYPE.SINGLETON;
                } else if (levelCheck === 0) {
                    breadcrumbItemLevel = SEARCH_TELEMETRY_EVENT.LEVEL_TYPE.ROOT;
                } else if (levelCheck === (breadcrumbLength - 1)) {
                    breadcrumbItemLevel = SEARCH_TELEMETRY_EVENT.LEVEL_TYPE.LEAF;
                } else {
                    breadcrumbItemLevel = SEARCH_TELEMETRY_EVENT.LEVEL_TYPE.INTERMEDIATE;
                }
                return (breadcrumbItemLevel + ' ' + getItemOfBreadcrumbUptoClickElement(levelCheck,
                    clickBreadcrumbItemText, breadcrumbData));
            };

            var getItemOfBreadcrumbUptoClickElement = function(levelCheck, clickBreadcrumbItemText, breadcrumbData) {
                var breadcrumbDataUptoClickElement = breadcrumbData.slice(0, levelCheck + 1);
                return getBreadCrumbValue(breadcrumbDataUptoClickElement);
            };

            var getIndexOfBreadcrumb = function(clickBreadcrumbItemText, breadcrumbData) {
                var breadcrumbIndex;
                breadcrumbData.map(function(crumb, crumbIndex) {
                    if (crumb.title === clickBreadcrumbItemText) {
                        breadcrumbIndex = crumbIndex;
                    }
                });
                return breadcrumbIndex;
            };

            var getBreadCrumbValue = function(breadcrumbData) {
                var breadcrumbValue = breadcrumbData.map(function(crumb) {
                    return crumb.title;
                }).join(' > ');
                return breadcrumbValue;
            };

            var getCompleteBreadCrumb = function(breadcrumbList) {
                var completeBreadcrumb = [];
                for (var i = 0; i < breadcrumbList.length; i++) {
                    completeBreadcrumb[i] = getBreadCrumbValue(breadcrumbList[i]);
                }
                return completeBreadcrumb.join(' ');
            };
        }
    ]);
