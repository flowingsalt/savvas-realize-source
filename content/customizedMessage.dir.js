/*
 * Display the appropriate customize message for a content item
 * Usage: <customized-message='item' />
 * NOTE: *BOTH* Content and External source item  objects get passed to this directive.
 *          ANY time this file is updated to access methods expected on Content item,
 *          make sure same methods exist on external source item  - even if stubbed to equal angular.noop
*/
angular.module('Realize.Content.customizedMessage', [
    'Realize.constants.mediaType'
    ])
    .directive('customizedMessage', [
        'MEDIA_TYPE',
        'featureManagementService',
        function(MEDIA_TYPE, featureManagementService) {
            'use strict';

            return {
                templateUrl: 'templates/content/customizedMessage.dir.html',

                link: function(scope, el, attrs) {
                    var item = scope.$eval(attrs.customizedMessage),
                        isThumbnailView = scope.$eval(attrs.thumbnailView),
                        isSearch = scope.$eval(attrs.forSearchResult),
                        isCustomizedTest,
                        isMyContentUploadedFile,
                        isMyContentTestOrLink,
                        isMyUploadedLesson,
                        isLessonCustomizedByYou,
                        isAdaptiveHomework;

                    scope.messageCode = '';
                    scope.customizedDate = '';
                    scope.messageClass = 'customized';

                    isCustomizedTest = function() {
                        return item.$isCustomizedTest();
                    };

                    isMyContentTestOrLink = function() {
                        var userCreatedTestNotCustomized = item.$isTest() &&
                            !item.originalItemId &&
                            !item.$isCustomizedTest();
                        return (item.mediaType === 'Link' || userCreatedTestNotCustomized ||
                        item.isDiscussionPrompt()) && item.contribSource === 'My Uploads';
                    };

                    isMyContentUploadedFile = function() {
                        return item.mediaType !== 'Link' &&
                            !item.$isLesson() &&
                            !item.$isTest() &&
                            !item.isDiscussionPrompt() &&
                            item.contribSource === 'My Uploads';
                    };

                    isMyUploadedLesson = function() {
                        return item.$isLesson() && item.contribSource === 'My Uploads';
                    };

                    isLessonCustomizedByYou = function() {
                        return item.$hasCustomizedLesson();
                    };

                    isAdaptiveHomework = function(item) {
                        return item.mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK;
                    };

                    //Set msg and date
                    if (isSearch && isMyContentUploadedFile()) {
                        scope.messageCode = 'searchResults.status.uploadedByYou';
                        scope.customizedDate = item.contribDate;
                    } else if (isSearch && isMyContentTestOrLink()) {
                        scope.messageCode = 'searchResults.status.addedByYou';
                        scope.customizedDate = item.contribDate;
                    } else if (isSearch && isMyUploadedLesson()) {
                        scope.messageCode = 'content.customizedOn';
                        scope.customizedDate = item.contribDate;
                    } else if (!isSearch && isLessonCustomizedByYou()) {
                        scope.messageCode = 'content.customizedOn';
                        scope.customizedDate = item.customizedItem.contribDate;
                    } else if (isCustomizedTest()) {
                        if (!isThumbnailView) {
                            scope.messageClass = 'customized-date-text';
                        }
                        scope.messageCode = 'content.customizedOn';
                        scope.customizedDate = item.$getCustomizeContribDate();
                    } else if (isAdaptiveHomework(item) &&
                        !featureManagementService.isKnewtonRecommendationDisabled()) {
                        scope.messageClass += ' adaptive';
                        scope.messageCode = 'content.poweredByKnewton';
                    }

                    // Different message for thumbnail view
                    if (isThumbnailView && scope.messageCode === 'content.customizedOn') {
                        scope.messageCode = 'content.customized';
                    }
                } // End link
            };
        }
    ]);
