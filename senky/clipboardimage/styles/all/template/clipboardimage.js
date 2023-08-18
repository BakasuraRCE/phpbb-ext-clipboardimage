(function (window, $, phpbb, text_name) {
    'use strict';

    let text,
        images,
        editor_textarea,
        current_cursor_position,
        uploadImages = function () {
            // save cursor pointer when have more than one attachment
            editor_textarea = document.forms[form_name].elements[text_name];
            current_cursor_position = [editor_textarea.selectionStart, editor_textarea.selectionEnd];
            // upload files
            phpbb.plupload.uploader.addFile(images);
            phpbb.plupload.uploader.start();
        },
        preventDefaultAndRemovePopup = function (e) {
            e.preventDefault();

            let popup = $('.popup-fixed').length ? '.popup-fixed' : '#paste-popup';
            $(popup).slideUp(400, function () {
                $(this).remove();
            });
        },
        displayPopup = function () {
            let $textarea = $('[name="' + text_name + '"]');
            $textarea.after('<div id="paste-popup" style="display:none">' + senky_clipboardimage_lang.copy + '<br><br><a href="#" id="paste-text" class="button2">' + senky_clipboardimage_lang.text + '</a> <a href="#" id="paste-image" class="button2">' + senky_clipboardimage_lang.image + '</a> <a href="#" id="paste-both" class="button2">' + senky_clipboardimage_lang.both + '</a></div>');

            $('#paste-text').on('click', function (e) {
                preventDefaultAndRemovePopup(e);
                insert_text(text);
            });
            $('#paste-image').on('click', function (e) {
                preventDefaultAndRemovePopup(e);
                uploadImages();
            });
            $('#paste-both').on('click', function (e) {
                preventDefaultAndRemovePopup(e);
                insert_text(text);
                uploadImages();
            });

            // in case popup would be hidden below viewport, make it fixed
            let viewportTop = $(window).scrollTop(),
                viewportBottom = viewportTop + $(window).height(),
                $popup = $('#paste-popup'),
                popupTop = $textarea.offset().top + $textarea.outerHeight();
            if (popupTop > viewportBottom) {
                $popup.addClass('panel bg2').css({
                    zIndex: 999,
                    position: 'fixed',
                    bottom: 0
                });
            }

            $('#paste-popup').slideDown();
        },
        renameFile = function (originalFile, newName) {
            return new File([originalFile], newName, {
                type: originalFile.type,
                lastModified: originalFile.lastModified,
            });
        },
        getFormattedDateTime = function () {
            let formatOptions = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };
            return new Date().toLocaleString('en-US', formatOptions).replace(/[\/:*?"<>|]/g, '-');
        };

    $(window).on('paste', function (e) {
        let clipboardData = e.originalEvent.clipboardData || window.clipboardData;
        if (clipboardData === false || clipboardData.items === false) {
            return;
        }
        text = String(clipboardData.getData('text'));

        // test whether there is a mix of text and images in the clipboard
        // along the way, store data into variables for further use even
        // when user flushes the clipboard
        images = [];
        $.each(clipboardData.items, function (_, item) {
            if (item.type.indexOf('image') !== -1) {
                let image = item.getAsFile();
                // rename images without name just to distinguish them visually
                if (image.name === 'image.png')
                    image = renameFile(image, getFormattedDateTime() + ".png");
                images.push(image);
            }
        });

        // don't paste text when we have to decide what to do
        if (text.length && images.length) {
            e.preventDefault();
            displayPopup();
        }

        // no text - just upload images
        if (!text.length) {
            uploadImages();
        }

        // no image but some text here - let the browser do its job
    });

    // place new image inline
    phpbb.plupload.uploader.bind('FileUploaded', function (_, file, response) {
        // Make sure this image comes from the clipboard.
        // Otherwise do not inline the attachment.
        let clipboardImg = images.find(function (img) {
            return img.name === file.name && img.size === file.origSize;
        });
        if (!clipboardImg) {
            return;
        }

        try {
            let json = JSON.parse(response.response);
            if (typeof json.title === 'undefined' && !json.error && file.status === plupload.DONE) {
                // restore cursor pointer when have more than one attachment
                editor_textarea.selectionStart = current_cursor_position[0];
                editor_textarea.selectionEnd = current_cursor_position[1];

                attachInline(phpbb.plupload.getIndex(json.data[0].attach_id), json.data[0].real_filename);
            }
        } catch (e) {
            console.log(e)
        }
    });
})(window, jQuery, phpbb, text_name);
