import type { Message } from 'ai';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { useLocation } from '@remix-run/react';
import { db, chatId } from '~/lib/persistence/useChatHistory';
import { forkChat } from '~/lib/persistence/db';
import { toast } from 'react-toastify';
import WithTooltip from '~/components/ui/Tooltip';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [] } = props;
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const profile = useStore(profileStore);

  // Check if we should auto-scroll based on scroll position
  const checkShouldAutoScroll = () => {
    if (!containerRef.current) {
      return true;
    }

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    return distanceFromBottom < 100;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!shouldAutoScroll || isUserInteracting) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Handle user interaction and scroll position
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const handleInteractionStart = () => {
      setIsUserInteracting(true);
    };

    const handleInteractionEnd = () => {
      if (checkShouldAutoScroll()) {
        setTimeout(() => setIsUserInteracting(false), 100);
      }
    };

    const handleScroll = () => {
      const { scrollTop } = container;
      const shouldScroll = checkShouldAutoScroll();

      // Update auto-scroll state based on scroll position
      setShouldAutoScroll(shouldScroll);

      // If scrolling up, disable auto-scroll
      if (scrollTop < lastScrollTop) {
        setIsUserInteracting(true);
      }

      setLastScrollTop(scrollTop);
    };

    container.addEventListener('mousedown', handleInteractionStart);
    container.addEventListener('mouseup', handleInteractionEnd);
    container.addEventListener('touchstart', handleInteractionStart);
    container.addEventListener('touchend', handleInteractionEnd);
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('mousedown', handleInteractionStart);
      container.removeEventListener('mouseup', handleInteractionEnd);
      container.removeEventListener('touchstart', handleInteractionStart);
      container.removeEventListener('touchend', handleInteractionEnd);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollTop]);

  // Scroll to bottom when new messages are added or during streaming
  useEffect(() => {
    if (messages.length > 0 && (isStreaming || shouldAutoScroll)) {
      scrollToBottom('smooth');
    }
  }, [messages, isStreaming, shouldAutoScroll]);

  // Initial scroll on component mount
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('instant');
      setShouldAutoScroll(true);
    }
  }, []);

  const handleRewind = (messageId: string) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('rewindTo', messageId);
    window.location.search = searchParams.toString();
  };

  return (
    <div
      id={id}
      ref={(el) => {
        // Combine refs
        if (typeof ref === 'function') {
          ref(el);
        }

        (containerRef as any).current = el;

        return undefined;
      }}
      className={props.className}
    >
      {messages.length > 0
        ? messages.map((message, index) => {
            const { role, content, id: messageId, annotations } = message;
            const isUserMessage = role === 'user';
            const isFirst = index === 0;
            const isLast = index === messages.length - 1;
            const isHidden = annotations?.includes('hidden');

            if (isHidden) {
              return <Fragment key={index} />;
            }

            return (
              <div
                key={index}
                className={classNames('flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)]', {
                  'bg-bolt-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                  'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent':
                    isStreaming && isLast,
                  'mt-4': !isFirst,
                })}
              >
                {isUserMessage && (
                  <div className="flex items-center justify-center w-[40px] h-[40px] overflow-hidden bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-500 rounded-full shrink-0 self-start">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile?.username || 'User'}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="sync"
                      />
                    ) : (
                      <div className="i-ph:user-fill text-2xl" />
                    )}
                  </div>
                )}
                <div className="grid grid-col-1 w-full">
                  {isUserMessage ? (
                    <UserMessage content={content} />
                  ) : (
                    <AssistantMessage content={content} annotations={message.annotations} />
                  )}
                </div>
                {!isUserMessage && (
                  <div className="flex gap-2 flex-col lg:flex-row">
                    {messageId && (
                      <WithTooltip tooltip="Revert to this message">
                        <button
                          onClick={() => handleRewind(messageId)}
                          key="i-ph:arrow-u-up-left"
                          className={classNames(
                            'i-ph:arrow-u-up-left',
                            'text-xl text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors',
                          )}
                        />
                      </WithTooltip>
                    )}
                  </div>
                )}
              </div>
            );
          })
        : null}
      <div ref={messagesEndRef} /> {/* Add an empty div as scroll anchor */}
      {isStreaming && (
        <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
      )}
    </div>
  );
});
