import {IconDownload} from '../Icon/Icon';
import {Text} from '../Text/Text';

export function DownloadButton({
  className,
  buttonText,
  buttonURL,
  openInNewTab = true,
}) {
  return (
    <>
      <a
        className={className}
        href={buttonURL}
        target={openInNewTab ? '_blank' : ''}
      >
        <IconDownload
          viewBox="0 0 20 20"
          fill="none"
          stroke="none"
          width="20"
          height="20"
        />
        <Text className={'whitespace-nowrap'}>{buttonText}</Text>
      </a>
    </>
  );
}
