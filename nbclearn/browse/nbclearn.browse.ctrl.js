angular.module('Realize.NbcLearn.browse', [
        'Realize.paths',
        'Realize.alerts.alertDirective',
        'RealizeDataServices.ProgramService',
        'Realize.myContent.myContentDataService',
        'ModalServices',
        'rlzComponents.components.i18n',
        'Realize.content.fullscreenPlayer',
        'Realize.navigationService'
    ])
    .controller('NBCLearnBrowseCtrl', [
        '$scope',
        '$rootScope',
        '$q',
        '$log',
        '$location',
        '$window',
        'ProgramService',
        'MyContent',
        'Modal',
        'NavigationService',
        'REST_PATH',
        function($scope, $rootScope, $q, $log, $location, $window, ProgramService, MyContent,
                 Modal, NavigationService, REST_PATH) {

            'use strict';

            $rootScope.hidePlatform = true;
            $scope.showBack = true;

            var ctrl = this,
                priorRoute = NavigationService.previousRoute;

            ctrl.sourceUrl = REST_PATH + '/nbc/learn/';

            ctrl.back = function() {
                NavigationService.back('/home');
            };

            ctrl.alertIsSet = false;
            ctrl.alertDetails = {};

            // if query params of prior route programId and programVersion,
            // use it instead of giving program select modal
            ctrl.rlzMyContentProgram = undefined;
            if (priorRoute && priorRoute.params && 'programId' in priorRoute.params) {
                ctrl.rlzMyContentProgram = {
                    id: priorRoute.params.programId,
                    version: priorRoute.params.programVersion
                };
            }

            // update each time an item is saved to MyContent, as may
            // possibly be to different Programs each time
            ctrl.rlzMyContentUrl = undefined;

            function persistNbcLearnItemToMyContent(rlzProgram, nbcLearnItem) {

                var myContentPayload = {
                    contribSource: 'NBC Learn',
                    title: nbcLearnItem.title,
                    text: [
                        nbcLearnItem.description,
                        '<strong>General Information</strong>',
                        'Source: ' + nbcLearnItem.generalInfo.source,
                        'Creator: ' + nbcLearnItem.generalInfo.creator,
                        'Air/Publish Date: ' + nbcLearnItem.generalInfo.airDate,
                        'Event Date: ' + nbcLearnItem.generalInfo.eventDate,
                        'Resource Type: ' + nbcLearnItem.generalInfo.resourceType,
                        'Copyright: ' + nbcLearnItem.generalInfo.copyright,
                        'Copyright Date: ' + nbcLearnItem.generalInfo.copyrightDate,
                        'Clip Length: ' + nbcLearnItem.generalInfo.clipLength
                    ].join('<br/>'),
                    keywords: nbcLearnItem.keywords,
                    fileType: 'URL',
                    mediaType: 'Video'
                };

                MyContent.addContentItemToMyLibrary(
                    {
                        //Server will replace URL with appropriate one with embedded token,
                        // all we need is cuecard param and contribSource to be correct
                        url: 'http://video?cuecard=' + nbcLearnItem.cueCardId,
                        json: angular.toJson(myContentPayload)
                    },
                    rlzProgram.id
                ).then(function() {
                    ctrl.rlzMyContentUrl  = [
                        'program',
                        rlzProgram.id,
                        rlzProgram.version,
                        'myContent'
                    ].join('/');

                    ctrl.alertDetails = {
                        autoClose: true,
                        type: 'success',
                        icon: 'ok-sign'
                    };

                    MyContent.setSuccessMsgFlag('link', true);
                }).catch(function(err) {
                    $log.warn('Error persisting NBC Learn item to MyContent', err, nbcLearnItem, rlzProgram.id);

                    ctrl.alertDetails = {
                        type: 'danger',
                        icon: 'exclamation-sign',
                        autoClose: false
                    };
                }).finally(function() {
                    ctrl.alertIsSet = true;
                });
            }

            ctrl.saveNbcLearnToMyContent = function(event) {

                //chromevox triggers window.message event,
                // so need to make sure payload is right for nbc learn
                if (!(event.data && event.data.cueCardId)) {
                    return;
                }

                // if we came to nbclearn/browse from a specific program's MyContent, use that program
                if (ctrl.rlzMyContentProgram) {
                    persistNbcLearnItemToMyContent(ctrl.rlzMyContentProgram, event.data);
                } else {
                    ProgramService.getAllPrograms().then(function(response) {
                        showProgramSelectModal(response.results).then(function(selectedProgram) {
                            if (selectedProgram) {
                                persistNbcLearnItemToMyContent(selectedProgram, event.data);
                            }
                        });
                    }).catch(function(err) {
                        $log.warn('Error retrieving all programs for NBC Learn to MyContent integration', err);

                        ctrl.alertDetails = {
                            type: 'danger',
                            icon: 'exclamation-sign',
                            autoClose: false
                        };

                        ctrl.alertIsSet = true;
                    });
                }
            };

            ctrl.navigateToMyContent = function() {
                if (ctrl.rlzMyContentUrl) {
                    $location.path(ctrl.rlzMyContentUrl);
                }
            };

            $window.addEventListener('message', ctrl.saveNbcLearnToMyContent, false);

            $scope.$on('$destroy', function() {
                $window.removeEventListener('message', ctrl.saveNbcLearnToMyContent);
            });

            function showProgramSelectModal(programs) {
                var modalScope = $scope.$new(true),
                    defer = $q.defer();

                modalScope.close = function() {
                    Modal.hideDialog().then(function() {
                        defer.resolve();
                        modalScope.$destroy();
                    });
                };

                modalScope.programs = programs;
                modalScope.selectedProgram = undefined;

                modalScope.selectProgram = function(program) {
                    modalScope.selectedProgram = program;
                };

                modalScope.save = function() {
                    Modal.hideDialog().then(function() {
                        defer.resolve(modalScope.selectedProgram);
                        modalScope.$destroy();
                    });
                };

                Modal.showDialog('templates/nbclearn/browse/programSelectModal.html', modalScope);

                return defer.promise;
            }
        }
    ]);
