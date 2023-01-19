angular.module('Realize.paths', [])
    .constant('REST_PATH', window.restPath)
    .constant('ROOT_PATH', window.rootPath)
    .constant('TEMPLATE_PATH', window.rootPath)
    .constant('MEDIA_PATH', window.mediaPath)
    .constant('SCRIPT_PATH', window.mediaPath + '/js')
    .constant('COMPONENT_TEMPLATE_PATH', window.mediaPath + '/js')
    .constant('PDFVIEWER_PATH', window.mediaPath + '/lib/pdfjs-dist/web-custom')
    .constant('THUMBNAIL_PATH', window.thumbnailPath)
    .constant('SHARED_THUMBNAIL_PATH', window.thumbnailPath + '/shared')
    .constant('CONTINEO_SERVER_URL', window.contineoServerUrl)
    .constant('CONTINEO_CAT_URL', window.contineoCatUrl)
    .constant('CONTINEO_SERVER_HELP_URL', window.contineoServerHelpUrl)
    .constant('DISCUSSION_API_URL', window.discussionApiUrl)
    .constant('DISCUSSION_UI_DIST_PATH', window.discussionUIDistributionPath)
    .constant('PATH', {
        REST: window.restPath,
        ROOT: window.rootPath,
        COMPONENT: window.mediaPath + '/js',
        TEMPLATES: window.rootPath,
        MEDIA: window.mediaPath,
        IMAGES: window.mediaPath + '/skins/default/images',
        THUMBNAILS: window.thumbnailPath,
        SHARED_THUMBNAILS: window.thumbnailPath + '/shared',
        TEMPLATE_CACHE: 'templates',
        TEMPLATE_ROOT: 'templates',
        SUBNAV: '/app/header/subNav/'
    });
