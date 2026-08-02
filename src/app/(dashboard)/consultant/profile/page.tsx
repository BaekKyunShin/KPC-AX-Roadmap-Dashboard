import ProfilePageClient from '../../_components/ProfilePageClient';

export default function ConsultantProfilePage() {
  return (
    <ProfilePageClient
      backUrl="/consultant/projects"
      successRedirectUrl="/consultant/projects"
      backLabel="프로젝트 목록으로"
    />
  );
}
