angular.module('Realize.content.media-icon', [
    'realize-lib.ui.fallback-strategy',
    'Realize.filters.mediaIcon',
    'Realize.imgUtils.imgSwap',
    'Realize.constants.contentUploadTypes'
])
    .run([
        '$templateCache',
        function($templateCache) {
            'use strict';

            // TODO: bring out into real html file and integrate into build
            $templateCache.put('/templates/realize-lib/content/media-icon/media-icon.html', [
                '<div class="mediaIcon with-tab" aria-hidden="true">',
                '<img data-e2e-id="mediaIconImageId" ng-src="{{ src }}" alt="{{ content.$getTitle() }}"',
                'fallback-strategy="fallback"',
                ' image-swap="{{ imgLoadedAsync }}" />',
                '<span ng-transclude></span>',
                '</div>'
            ].join('\n'));
        }
    ])
    .directive('mediaIcon', [
        '$log',
        '$filter',
        'MEDIA_PATH',
        'CONTENT_UPLOAD_TYPES',
        function($log, $filter, MEDIA_PATH, CONTENT_UPLOAD_TYPES) {
            'use strict';

            return {
                scope: true,
                replace: true,
                transclude: true,
                templateUrl: '/templates/realize-lib/content/media-icon/media-icon.html',
                compile: function() {

                    var imagePath = MEDIA_PATH + '/skins/default/images',
                        defaultIcons = imagePath + '/default_icons';

                    return function(scope, element, attrs) {

                        scope.content = scope.$eval(attrs.mediaIcon);
                        scope.mediaType = $filter('mediaIcon')(scope.content);

                        if (attrs.overrideMediaType) {
                            scope.mediaType = attrs.overrideMediaType;
                        }

                        scope.imgLoadedAsync = null;

                        if (!angular.isDefined(scope.mediaType)) {
                            if (scope.content.isExternalResource && scope.content.isExternalResource()) {
                                var openEdCustomThumb = scope.content.$getThumbnailUrl();
                                if (openEdCustomThumb) {
                                    scope.imgLoadedAsync = openEdCustomThumb;
                                }
                                //Set to default, as our image-swap directive will swap out for custom on load
                                scope.src = defaultIcons + scope.content.getExternalResourceDefaultImage();

                            } else {
                                $log.error('Media type is undefined!', scope.content);
                            }
                            return;
                        }

                        element.addClass(scope.mediaType);

                        var iconPath = imagePath + '/mediatype/icon/',
                            custom = false,
                            customType = 'TIER',
                            large = element.hasClass('large'),
                            isTool = attrs.type === 'tool',
                            isGoogleDriveItem = function() {
                                return scope.mediaType === CONTENT_UPLOAD_TYPES.LINK &&
                                    scope.content.externalSource === CONTENT_UPLOAD_TYPES.GOOGLE_DRIVE &&
                                    scope.content.fileType === CONTENT_UPLOAD_TYPES.URL;
                            },
                            isGoogleDocItem = function() {
                                return scope.content.externalSource === CONTENT_UPLOAD_TYPES.GOOGLE_DOC &&
                                    scope.content.fileType === CONTENT_UPLOAD_TYPES.URL;
                            },
                            isOneDriveItem = function() {
                                return scope.mediaType === CONTENT_UPLOAD_TYPES.LINK &&
                                    scope.content.externalSource === CONTENT_UPLOAD_TYPES.ONE_DRIVE &&
                                    scope.content.fileType === CONTENT_UPLOAD_TYPES.URL;
                            };

                        var setSource = function() {
                            var path = iconPath,
                                src,
                                size,
                                fallback;
                            if (large) {
                                path += 'large/';
                            }

                            src = path + scope.mediaType + '@2x.png';
                            if (scope.mediaType.indexOf('test') >= 0 && scope.content.essayPrompt) {
                                src = path + 'toc_essayscorer_list@2x.png';
                            }

                            if (isTool) {
                                element.removeClass('mediaIcon').removeClass('with-tab');
                                scope.fallback = [defaultIcons + '/tool@2x.png'];

                                src = scope.content.$getThumbnailUrl('TOOL', false);

                                if (!src || src === fallback) {
                                    src = scope.fallback.shift();
                                }

                                if (src.indexOf('@2x') > 0) {
                                    scope.fallback.unshift(src.replace('@2x', ''));
                                }

                                scope.src = src;
                                return;
                            }

                            if (scope.content.root) {
                                // program
                                if (attrs.type === 'dropdown') {
                                    fallback = defaultIcons + '/no_program_dropdown@2x.png';
                                    src = scope.content.$getThumbnailUrl('PROGRAM_SUBNAV');
                                } else if (attrs.type === 'course') {
                                    fallback = defaultIcons + '/no_program_thumb_course@2x.png';
                                    src = scope.content.$getThumbnailUrl('PROGRAM');
                                    element.removeClass('mediaIcon');
                                } else {
                                    size = large ? 'large' : 'small';
                                    fallback = defaultIcons + '/no_program_home' + size + '@2x.png';
                                    src = scope.content.$getThumbnailUrl('HOME', large);
                                }
                                element.removeClass('with-tab');
                            } else if (scope.content.isGroupedContent && attrs.type === 'course') {
                                fallback = defaultIcons + '/no_program_thumb_course@2x.png';
                                src = scope.content.$getThumbnailUrl('PROGRAM');
                                element.removeClass('mediaIcon');
                            } else if (scope.mediaType === 'etext' && attrs.type === 'program') {
                                // etext program
                                fallback = defaultIcons + '/no_program_etext@2x.png';
                                src = scope.content.$getThumbnailUrl('ETEXT', false) || fallback;
                                element.removeClass('with-tab');
                            } else {
                                // all other media icons
                                if (scope.mediaType === 'interactive_media') {
                                    src = path + 'activity@2x.png';

                                } else if (scope.mediaType === 'selected_reading' ||
                                    scope.mediaType === 'leveled_reader') {
                                    src = path + 'etext@2x.png';

                                } else if (scope.mediaType === 'center') {
                                    size = large ? '_grid' : '';
                                    src = path + 'center@2x.png';

                                } else if (scope.content.isExternalResource && scope.content.isExternalResource()) {
                                    src = defaultIcons + scope.content.getExternalResourceDefaultImage();
                                    element.removeClass('with-tab');

                                } else if (scope.mediaType === 'video' &&
                                    scope.content.$isNbcItem &&
                                    scope.content.$isNbcItem()) {
                                    src = path + 'nbc_learn_video@2x.png';

                                } else if (isGoogleDocItem()) {
                                    src = path + 'google_doc@2x.png';

                                } else if (isGoogleDriveItem()) {
                                    src = path + 'google_drive_link@2x.png';

                                } else if (isOneDriveItem()) {
                                    src = path + 'one_drive_link@2x.png';
                                } else if (scope.mediaType === 'playlist') {
                                    src = path + 'playlist@2x.png';
                                }

                                fallback = src;

                                if (scope.content.thumbnailUrls && scope.content.thumbnailUrls.length) {
                                    // TODO hard-coded(customType=Tier), $getThumbnailUrl needs to be improved
                                    // assume custom thumbnail is displayed small unless "large" attribute is true
                                    var customSrc = scope.content.$getThumbnailUrl(customType, attrs.large ?
                                        scope.$eval(attrs.large) : false);
                                    if (customSrc) {
                                        src = customSrc;
                                        element.removeClass('with-tab').removeClass('mediaIcon')
                                            .addClass('customImage');
                                        custom = true;
                                    } else {
                                        // case: Either "List" or "Thumbnail" view having custom thumbnail
                                        // Then "customImage" class gets applied which is not getting removed if switch
                                        // to another view so again checking if no customSrc but class "customImage"
                                        if (element.hasClass('customImage')) {
                                            element.removeClass('customImage').addClass('mediaIcon')
                                                .addClass('with-tab');
                                        }
                                    }
                                }
                            }

                            scope.fallback = [fallback];
                            scope.$on('fallbackStrategy.fallback.applied', function(event, fallbackEle) {
                                var content = event.targetScope.content;
                                if (content &&  !content.isExternalResource() &&
                                    fallbackEle.parent().hasClass('customImage')) {

                                    fallbackEle.parent().addClass(
                                        'mediaIcon with-tab fallback-applied');
                                }
                            });

                            if (!src || src === fallback) {
                                src = scope.fallback.shift();
                            }

                            if (src.indexOf('@2x') > 0) {
                                scope.fallback.unshift(src.replace('@2x', ''));
                            }

                            scope.src = src;
                        };

                        setSource();

                        attrs.$observe('large', function(val) {
                            // TODO hoping there's a better way to do this
                            // watching the large attribute for switching between small and
                            // large icon if view changes (e.g. via toggle)
                            large = scope.$eval(val);
                            if (large) {
                                element.addClass('large');
                            } else {
                                element.removeClass('large');
                            }
                            setSource();
                        });
                    };
                }
            };
        }
    ]);
