import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const PrintPortal = ({ children }) => {
    const [container, setContainer] = useState(() => {
        let el = document.getElementById('quizki-print-portal');
        if (!el) {
            el = document.createElement('div');
            el.id = 'quizki-print-portal';
            document.body.appendChild(el);
        }
        return el;
    });

    useEffect(() => {
        let el = document.getElementById('quizki-print-portal');
        if (!el) {
            el = document.createElement('div');
            el.id = 'quizki-print-portal';
            document.body.appendChild(el);
            setContainer(el);
        } else if (!document.body.contains(el)) {
            document.body.appendChild(el);
            setContainer(el);
        }

        return () => {
            if (el) {
                el.innerHTML = '';
            }
        };
    }, []);

    if (!container) return children;

    return createPortal(children, container);
};

export default PrintPortal;
