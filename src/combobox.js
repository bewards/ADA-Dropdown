;(function($) {

    //
    // Contains keycodes needed for plugin
    //
    function keyCodes() {

        this.backspace = 8;
        this.tab = 9;
        this.enter = 13;
        this.esc = 27;

        this.space = 32;
        this.pageup = 33;
        this.pagedown = 34;
        this.end = 35;
        this.home = 36;

        this.up = 38;
        this.down = 40;

        this.del = 46;

    } // end keyCodes

    var defaults = {
        // GENERAL
        isEditable: false,

        // CALLBACKS
        onOptionSelected: function () { return true; }
    };

    // PLUGIN
    $.fn.combobox = function (options) {
        if (this.length === 0) {
            return this;
        }

        // support multiple elements
        if (this.length > 1) {
            this.each(function () {
                $(this).combobox(options);
            });
            return this;
        }

        // create a namespace to be used throughout the plugin
        var cb = {},
        // set a reference to our slider element
        el = this;

        // Return if combobox is already initialized
        if ($(el).data('combobox')) { return; }

        /**
         * ===================================================================================
         * = PRIVATE FUNCTIONS
         * ===================================================================================
         */

        /**
         * Initializes namespace settings to be used throughout plugin
         */
        var init = function () {
            var $el = $(el);
            // Return if slider is already initialized
            if ($el.data('combobox')) { return; }

            // merge user-supplied options with the defaults
            cb.settings = $.extend({}, defaults, options);

            // store controls
            cb.$edit = $el.find('.cb_edit');            // The jQuery object of the input (edit box)
            cb.$button = $el.find('.cb_button');        // The jQuery object of the button
            cb.$list = $el.find('.cb_list');             // The jQuery object of the option list
            cb.$options = getListOptions;          // An array of jQuery objects for the combobox options

            // store properties
            cb.$selected;                               // the current value of the combobox
            cb.$focused;                                // the currently selected option in the combo list
            cb.timer = null;                            // stores the close list timer that is set when combo looses focus

            // store utility
            cb.keys = new keyCodes();

            // perform all DOM / CSS modifications
            setup();
        };

        /**
         * Performs all DOM and CSS modifications: initializes the combobox elements, hides the list,
            and sets ARIA attributes
         */
        var setup = function () {
            // Hide the list of options
            cb.$list.hide().attr('aria-expanded', 'false');

            // If the edit box is to be readonly, aria-readonly must be defined as true
            if (cb.settings.editable === false) {
                cb.$edit.attr('aria-readonly', 'true');
            }

            // Set initial value for the edit box
            cb.$selected = cb.$options().filter('.selected');

            if (cb.$selected.length > 0) {
                cb.$edit.val(cb.$selected.text());
            }

            bindHandlers();
        };

        /**
         * Bind event handlers for the combobox elements
         */
        var bindHandlers = function () {

            ///////////////// bind editbox handlers /////////////////////////

            cb.$edit.keydown(function (e) {
                return handleEditKeyDown($(this), e);
            });

            cb.$edit.keypress(function (e) {
                return handleEditKeyPress($(this), e);
            });

            cb.$edit.blur(function (e) {
                return handleComboBlur($(this), e);
            });

            ///////////////// bind handlers for the button /////////////////////////

            cb.$button.click(function (e) {
                return handleButtonClick($(this), e);
            });

            cb.$button.mouseover(function (e) {
                return handleButtonMouseOver($(this), e);
            });

            cb.$button.mouseout(function (e) {
                return handleButtonMouseOut($(this), e);
            });

            cb.$button.mousedown(function (e) {
                return handleButtonMouseDown($(this), e);
            });

            cb.$button.mouseup(function (e) {
                return handleButtonMouseUp($(this), e);
            });

            ///////////////// bind listbox handlers /////////////////////////

            cb.$list.focus(function (e) {
                return handleComboFocus($(this), e);
            });

            cb.$list.blur(function (e) {
                return handleComboBlur($(this), e);
            });

            ///////////////// bind list option handlers /////////////////////////

            cb.$options().keydown(function (e) {
                return handleOptionKeyDown($(this), e);
            });

            cb.$options().keypress(function (e) {
                return handleOptionKeyPress($(this), e);
            });

            $('.cb').on('click', '.cb_list li[role=option]', function (e) {
                return handleOptionClick($(this), e);
            });

            cb.$options().focus(function (e) {
                return handleComboFocus($(this), e);
            });

            cb.$options().blur(function (e) {
                return handleComboBlur($(this), e);
            });
        };



        /* PRIVATE HELPERS */

        //
        // Gets the combobox list options
        //
        // @returns {jQuery obj} list options
        //
        var getListOptions = function () {
            return cb.$list.find('li');
        }

        //
        // Closes the list box if it is open
        //
        // @param (restore booleam) restore is true if function should restore higlight to stored list selection
        // @return N/A
        //
        var closeList = function (restore) {

            var $curOption = cb.$options().filter('.selected');

            if (restore === true) {
                $curOption = cb.$selected;

                // remove the selected class from the other list items
                cb.$options().removeClass('selected');

                // add selected class to the stored selection
                $curOption.addClass('selected');
            }

            cb.$list.hide().attr('aria-expanded', 'false');

            // set focus on the edit box
            cb.$edit.focus();

        } // end closeList()

        //
        // Opens the list box if it is closed
        //
        // @param (restore booleam) restore is true if function should restore higlight to stored list selection
        // @return N/A
        //
        var openList = function (restore) {

            var $curOption = cb.$options().filter('.selected');

            if (restore === true) {

                if (cb.$selected.length === 0) {
                    // select the first item
                    selectOption(cb.$options().first());
                }

                $curOption = cb.$selected;

                // remove the selected class from the other list items
                cb.$options().removeClass('selected');

                // add selected class to the stored selection
                $curOption.addClass('selected');
            }

            cb.$list.show().attr('aria-expanded', 'true');

            // scroll to the currently selected option
            cb.$list.scrollTop(calcOffset($curOption));

            // set focus on the selected item
            cb.$selected.focus();

        } // end openList();

        //
        // Toggles the display of the combobox options.
        //
        // @param (restore booleam) restore is true if toggle should restore higlight to stored list selection
        // @return N/A
        //
        var toggleList = function (restore) {

            if (el.isOpen()) {
                closeList(restore);
            }
            else {
                openList(restore);
            }

        } // end toggleList()

        //
        // Selects a new combobox option.
        // The jQuery object for the new option is stored and the selected class is added
        //
        // @param ($id object) $id is the jQuery object of the new option to select
        // @return N/A
        // 
        var selectOption = function ($option) {

            // If there is a selected option, remove the selected class from it
            if (cb.$selected.length > 0) {
                cb.$selected.removeClass('selected');
            }

            // add the selected class to the new option
            $option.addClass('selected');

            // store the newly selected option
            cb.$selected = $option;

            // update the edit box
            cb.$edit.val($option.text());

        } // end selectOption

        //
        // Function calcOffset() is a member function to calculate the pixel offset of a list option from the top
        // of the list
        //
        // @param ($id obj) $id is the jQuery object of the option to scroll to
        // @return (integer) returns the pixel offset of the option
        //
        var calcOffset = function ($option) {
            var offset = 0;
            var selectedNdx = cb.$options().index($option);

            for (var ndx = 0; ndx < selectedNdx; ndx++) {
                offset += cb.$options().eq(ndx).outerHeight();
            }

            return offset;

        } // end calcOffset



        /* HANDLERS */

        //
        // process keydown events for the edit box.
        //
        // @param ($id object) $id is the jQuery object for the element firing the event
        // @param (e object) e is the event object associated with the event
        // @return (boolean) Returns false if consuming; true if not processing
        //
        var handleEditKeyDown = function ($id, e) {

            var curNdx = cb.$options().index(cb.$selected);

            if (e.altKey && (e.keyCode === cb.keys.up || e.keyCode === cb.keys.down)) {

                toggleList(true);

                e.stopPropagation();
                return false;
            }

            switch (e.keyCode) {
                case cb.keys.backspace:
                case cb.keys.del: {
                    cb.$edit.val(cb.$selected.text());

                    e.stopPropagation();
                    return false;
                }
                case cb.keys.enter: {

                    // toggle the option list
                    toggleList(false);

                    e.stopPropagation();
                    return false;
                }
                case cb.keys.up: {

                    // move to the previous item in the list

                    if (curNdx > 0) {
                        var $prev = cb.$options().eq(curNdx - 1);

                        selectOption($prev);
                    }

                    e.stopPropagation();
                    return false;
                }
                case cb.keys.down: {

                    // move to the next item in the list

                    if (curNdx < cb.$options().length - 1) {
                        var $next = cb.$options().eq(curNdx + 1);

                        selectOption($next);
                    }

                    e.stopPropagation();
                    return false;
                }
            }

            return true;

        } // end handleEditKeyDown()

        //
        // Processes keypress events for the edit box
        // Needed for browsers that use keypress events to manipulate the window.
        //
        // @param (e object) e is the event object associated with the event
        // @param ($id object) $id is the jQuery object for the element firing the event
        // @return (boolean) Returns false if consuming; true if not processing
        //
        var handleEditKeyPress = function ($input, e) {

            var curNdx = cb.$options().index($input);

            if (e.altKey && (e.keyCode === cb.keys.up || e.keyCode === cb.keys.down)) {
                e.stopPropagation();
                return false;
            }

            switch (e.keyCode) {
                case cb.keys.esc:
                case cb.keys.enter: {

                    e.stopPropagation();
                    return false;
                }
            }

            return true;

        } // end handleEditKeyPress()

        //
        // Function handleComboBlur() is a member function to process blur events for
        // the combobox
        //
        // @param (e object) e is the event object associated with the event
        // @param ($id object) $id is the jQuery object for the element firing the event
        // @return (boolean) Returns true
        //
        var handleComboBlur = function ($el, e) {

            // store the currently selected value
            selectOption(cb.$options().filter('.selected'));

            // close the list box
            if (el.isOpen()) {
                cb.timer = window.setTimeout(function () { closeList(false); }, 40);
            }

            return true;

        } // end handleComboBlur()

        //
        // Processes click events for the combobox.
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean) Returns false
        //
        var handleOptionClick = function ($el, e) {

            // select the clicked item
            selectOption($el);

            // close the list
            closeList(false);

            e.stopPropagation();
            return false;

        } // end handleOptionClick()

        //
        // Processes focus events for the list box
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean) Returns true
        //
        var handleComboFocus = function ($el, e) {

            if (cb.timer != null) {
                window.clearTimeout(cb.timer);
                cb.timer = null;
            }

            return true;

        } // end handleComboFocus()

        //
        // Consumes button click events. This handler prevents
        // clicks on the button from reloading the page. This could also be done by adding 'onclick="false";' to the
        // button HTML markup.
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean)  returns false;
        //
        var handleButtonClick = function ($el, e) {

            e.stopPropagation();
            return false;

        } // end handleButtonClick();

        //
        // Processes button mouseover events
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean)  returns false;
        //
        var handleButtonMouseOver = function ($el, e) {

            e.stopPropagation();
            return false;

        } // end handleButtonMouseOver();

        //
        // Processes button mouseout events
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean)  returns false;
        //
        var handleButtonMouseOut = function ($el, e) {

            e.stopPropagation();
            return false;

        } // end handleButtonMouseOut();

        //
        // Processes button mousedown events
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean)  returns false;
        //
        var handleButtonMouseDown = function ($el, e) {

            // toggle the display of the option list
            toggleList(true);

            e.stopPropagation();
            return false;

        } // end handleButtonMouseDown();

        //
        // Processes button mouseup events
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean)  returns false;
        //
        var handleButtonMouseUp = function ($el, e) {

            e.stopPropagation();
            return false;

        } // end handleButtonMouseUp();

        //
        // Process keydown events for the combobox
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean) Returns false if consuming; true if not processing
        //
        var handleOptionKeyDown = function ($el, e) {

            var curNdx = cb.$options().index($el);

            if (e.ctrlKey) {
                // do not process
                return true;
            }

            switch (e.keyCode) {
                case cb.keys.tab: {
                    // update and close the combobox

                    if ($el.text() !== cb.$selected.text()) {

                        // store the new selection
                        selectOption($el);
                    }

                    // Close the option list
                    closeList(false);

                    // allow tab to propagate
                    return true;
                }
                case cb.keys.esc: {
                    // Do not change combobox value

                    // Close the option list
                    closeList(true);

                    e.stopPropagation();
                    return false;
                }
                case cb.keys.enter: {
                    // change the combobox value

                    if ($el.text() !== cb.$selected.text()) {

                        // store the new selection
                        selectOption($el);
                    }

                    // Close the option list
                    closeList(false);

                    e.stopPropagation();
                    return false;
                }
                case cb.keys.up: {

                    if (e.altKey) {
                        // alt+up toggles the list
                        toggleList(true);

                    }
                    else {
                        // move to the previous item in the list

                        if (curNdx > 0) {
                            var $prev = cb.$options().eq(curNdx - 1);

                            // remove the selected class from the current selection
                            $el.removeClass('selected');

                            // Add the selected class to the new selection
                            $prev.addClass('selected');

                            // scroll the list window to the new option
                            cb.$list.scrollTop(calcOffset($prev));

                            // Set focus on the new item
                            $prev.focus();
                        }
                    }

                    e.stopPropagation();
                    return false;
                }
                case cb.keys.down: {

                    if (e.altKey) {
                        // alt+up toggles the list
                        toggleList(true);
                    }
                    else {
                        // move to the next item in the list

                        if (curNdx < cb.$options().length - 1) {
                            var $next = cb.$options().eq(curNdx + 1);

                            // remove the selected from the current selection
                            $el.removeClass('selected');

                            // Add the selected class to the new selection
                            $next.addClass('selected');

                            // scroll the list window to the new option
                            cb.$list.scrollTop(calcOffset($next));

                            // Set focus on the new item
                            $next.focus();
                        }
                    }

                    e.stopPropagation();
                    return false;
                }
                case cb.keys.home: {
                    // select the first list item

                    var $first = cb.$options().first();

                    // remove the selected class from the current selection
                    cb.$options().eq(curNdx).removeClass('selected');

                    // Add the selected class to the new selection
                    $first.addClass('selected');

                    // scroll the list window to the new option
                    cb.$list.scrollTop(0);

                    // set focus on the first item
                    $first.focus();

                    e.stopPropagation();
                    return false;
                }
                case cb.keys.end: {
                    // select the last list item

                    var $last = cb.$options().last();

                    // remove the selected class from the current selection
                    cb.$options().eq(curNdx).removeClass('selected');

                    // Add the selected class to the new selection
                    $last.addClass('selected');

                    // scroll the list window to the new option
                    cb.$list.scrollTop(calcOffset($last));

                    // set focus on last item
                    $last.focus();

                    e.stopPropagation();
                    return false;
                }
            }

            return true;

        } // end handleOptionKeyDown()

        //
        // Process keypress events for the combobox. 
        //  Needed for browsers that use keypress to manipulate the window
        //
        // @param (e object) e is the event object associated with the event
        // @param ($el object) $el is the jQuery object for the element firing the event
        // @return (boolean) Returns false if consuming; true if not processing
        //
        var handleOptionKeyPress = function ($el, e) {

            var curNdx = cb.$options().index($el);

            if (e.altKey || e.ctrlKey || e.shiftKey) {
                // do not process
                return true;
            }

            switch (e.keyCode) {
                case cb.keys.esc:
                case cb.keys.enter:
                case cb.keys.up:
                case cb.keys.down:
                case cb.keys.home:
                case cb.keys.end: {
                    e.stopPropagation();
                    return false;
                }
            }

            return true;

        } // end handleOptionKeyPress()



        /**
         * ===================================================================================
         * = PUBLIC FUNCTIONS
         * ===================================================================================
         */
        el.getSelectedOption = function() {
            return cb.$selected;
        };

        el.isOpen = function() {
            if (cb.$list.attr('aria-expanded') === 'true') {
                return true;
            }
            else {
                return false;
            }
        }

        // INVOKE
        init();

        $(el).data('combobox', this);

        // returns the current jQuery object
        return this;
    };

})(jQuery);