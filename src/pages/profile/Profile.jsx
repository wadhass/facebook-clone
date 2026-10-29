
// Components...........
import AddPost from "../../components/addPost/AddPost"
import Feeds from "../../components/feeds/Feeds"
import UserProfile from "../../components/userProfile/UserProfile"
import { useParams } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"

export default function Profile (){
  const { id } = useParams()
  const { user } = useAuth()

  return (
    <>
    <UserProfile />
    {user?.id === id && <AddPost />}
    <Feeds authorId={id} />
    </>
  )
}
