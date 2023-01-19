/*
* Check if assessment has been assigned (and currently is in progress) before redirecting to customize assessment page
* Usage:
*   <customize-assessment='item'
*       show-customize-test-link
*       ca-if='additional show logic'
*       ca-program='program-used-for-routing'
*       ca-before-redirect='function-to-run-before-redirects()>'
*/
angular.module('Realize.assessment.customizeAssessmentDirective', [
    'ModalServices',
    'components.modal',
    'Realize.content',
    'Realize.content.constants',
    'Realize.assessment.assessmentDataService'
])
.directive('customizeAssessment', [
    '$log',
    'Modal',
    '$location',
    'Content',
    'CONTENT_CONSTANTS',
    'Assessment',
    'lwcI18nFilter',
    'standardModal',
    'assessmentEventTrackingService',
    'ASSESSMENT_EVENT_TRACKING_CONSTANTS',
    'TELEMETRY_CONSTANTS',
    function($log, Modal, $location, Content, CONTENT_CONSTANTS, Assessment, lwcI18nFilter, standardModal,
        assessmentEventTrackingService, ASSESSMENT_EVENT_TRACKING_CONSTANTS, TELEMETRY_CONSTANTS) {
        'use strict';

        return {
            link: function(scope, el, attrs) {
                el.on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var assessment = scope.$eval(attrs.customizeAssessment),
                        routeProgram = scope.$eval(attrs.caProgram),
                        beforeRedirect = scope.$eval(attrs.caBeforeRedirect),
                        originalId = assessment.id,
                        originalVersion = assessment.version,
                        isEssayPrompt = !!scope.$eval(attrs.isEssayPrompt);
                    var customizedItemId;

                    var navigateToCustomizationView = function(response) {
                        var clonedItem = angular.extend({}, assessment, {
                            id: response.equellaItemUuid,
                            version: response.equellaItemVersion,
                            editAssessment: true
                        });

                        if (angular.isFunction(beforeRedirect)) {
                            beforeRedirect();
                        }

                        if (routeProgram) {
                            $location.path(Content.getRoute(clonedItem, routeProgram));
                        } else {
                            var path = $location.path();
                            if ($location.search().backUrl) {
                                $location.search('backUrl', null);
                            }
                            $location.path(path + Content.getRoute(clonedItem));
                        }
                    };

                    var openCustomizeView = function() {
                        if (assessment.$isCustomizedTest()) {
                            var defaultVersion = 0;
                            originalId = angular.isDefined(assessment.originalItem) ?
                                assessment.originalItem.id : assessment.originalItemId;
                            originalVersion = angular.isDefined(assessment.originalItem) ?
                                assessment.originalItem.version : defaultVersion;
                            customizedItemId = assessment.id;
                        }
                        Assessment.clone(originalId, originalVersion, false, customizedItemId)
                            .then(function(response) {
                                navigateToCustomizationView(response);
                            }, function(err) {
                                $log.log(err);
                                Modal.simpleDialog('program.customizeAssessment.notAvailable.title',
                                    'program.customizeAssessment.notAvailable.message', null,
                                    {id: 'assessment.customize.notAvailable'}
                                );
                            });
                    };

                    var openCustomizationBuilder = function() {
                        Assessment.createCustomizeVersion(originalId, originalVersion)
                            .then(function(response) {
                                navigateToCustomizationView(response);
                            }, function(error) {
                                $log.log(error);
                                Modal.simpleDialog('program.customizeAssessment.notAvailable.title',
                                    'program.customizeAssessment.notAvailable.message', null,
                                    {id: 'assessment.customize.notAvailable'}
                                );
                            });
                    };

                    var okButton = {
                        label: lwcI18nFilter('global.action.button.ok'),
                        ariaLabel: lwcI18nFilter('global.action.button.ok'),
                        action: function() {
                            standardModal.deactivate();
                        },
                        className: [],
                        disabled: false,
                    };

                    function isAssignedStatusMessage(title, body, builderNavHandler) {
                        var buttons = { //OK and CANCEL uses default text
                            OK: {
                                handler: builderNavHandler,
                                isDefault: true
                            },
                            CANCEL: {}
                        };

                        Modal.simpleDialog(title, body, buttons, {
                            id: 'assessmentAssignedDialog'
                        });
                    }

                    function showMaxCustomizedVersionsMessage() {
                        standardModal.activate({
                            heading: lwcI18nFilter('content.modal.title'),
                            description: lwcI18nFilter('content.modal.message'),
                            buttons: [okButton],
                            closeButton: true,
                            overlayActive: true,
                            cssClass: 'customized-items-popup',
                            closeAction: function() {
                                standardModal.deactivate();
                            }
                        });
                    }

                    function sendAssessmentTelemetryEvents(assessment, count) {
                        var extensionKeys = {
                            id: ASSESSMENT_EVENT_TRACKING_CONSTANTS.OPEN,
                            area: $location.path().indexOf('/program') !== -1 ?
                                TELEMETRY_CONSTANTS.EVENT_TYPE.PROGRAMS :
                                TELEMETRY_CONSTANTS.EVENT_TYPE.SEARCH,
                            page: $location.path().indexOf('/program') !== -1 ?
                                scope.tocView && scope.tocView !== 'list' ?
                                TELEMETRY_CONSTANTS.EVENT_TYPE.TABLE_OF_CONTENTS_THUMBNAIL_VIEW :
                                TELEMETRY_CONSTANTS.EVENT_TYPE.TABLE_OF_CONTENTS :
                                TELEMETRY_CONSTANTS.EVENT_TYPE.SEARCH_RESULTS,
                            product: scope.program ? scope.program.title : TELEMETRY_CONSTANTS.NO_PROGRAM_AVAILABLE,
                            name: ASSESSMENT_EVENT_TRACKING_CONSTANTS.NAME.CUSTOMIZE_ASSESSMENT_LINK,
                            description: assessment.$getTitle(),
                            value: count + 1
                        };
                        assessmentEventTrackingService.sendTelemetryEvents(extensionKeys);
                    }
                    // checking the condition to differentiate between original assessment,
                    // customized version and my content
                    var isMyContent = assessment.contribSource === 'My Uploads';
                    var isCustomizedTest = assessment.$isCustomizedTest();

                    var isAssessmentAssigned = function() {
                        assessment.$isAssigned().then(function(isAssigned) {
                            var title = (isEssayPrompt ? 'essayPrompt.' : '') +
                                'customizeAssessment.assessmentAssignedDialog.title',
                                body = (isEssayPrompt ? 'essayPrompt.' : '') +
                                'customizeAssessment.assessmentAssignedDialog.body';

                            if (isAssigned && !isCustomizedTest && !isMyContent) {
                                isAssignedStatusMessage(title, body, openCustomizationBuilder);
                            } else if (!isAssigned && !isCustomizedTest && !isMyContent) {
                                openCustomizationBuilder();
                            } else if (isAssigned && (isCustomizedTest || isMyContent)) {
                                isAssignedStatusMessage(title, body, openCustomizeView);
                            } else {
                                openCustomizeView();
                            }
                        });
                    };

                    if (!isCustomizedTest && !(isMyContent && !assessment.originalItemId)) {
                        Assessment.getCustomizedVersionCount(originalId).then(function(count) {
                            if (count >= CONTENT_CONSTANTS.MAX_ASSESSMENT_CUSTOMISE_VERSIONS) {
                                showMaxCustomizedVersionsMessage();
                                return;
                            }
                            sendAssessmentTelemetryEvents(assessment, count);
                            isAssessmentAssigned();
                        });
                    } else {
                        isAssessmentAssigned();
                    }
                    // bring back to angular
                    scope.$apply();
                });
            } // End link
        };
    }
])
// customized ng-if for customize-assessment directive, takes additional show/hide logic through ca-if='logic' attr
.directive('showCustomizeTestLink', [
    '$log',
    '$rootScope',
    'ngIfDirective',
    function($log, $rootScope, ngIfDirective) {
        'use strict';

        var ngIf = ngIfDirective[0];
        return {
            transclude: ngIf.transclude,
            priority: ngIf.priority,
            terminal: ngIf.terminal,
            restrict: ngIf.restrict,
            link: function(scope, el, attrs) {
                var caItem = scope.$eval(attrs.customizeAssessment),
                    caIf = attrs.caIf || '',
                    showCustomizeTestLink = caItem && caItem.$isTest() && $rootScope.currentUser.$canCustomizeItems();

                if (caIf) {
                    caIf = scope.$eval(caIf);
                } else {
                    caIf = true;
                }

                attrs.ngIf = function() {
                    return caIf && showCustomizeTestLink;
                };
                ngIf.link.apply(ngIf, arguments);
            }
        };
    }
]);
